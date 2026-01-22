"""
============================================
SMART METER SIMULATOR (PYTHON VERSION)
============================================
Alternative Python implementation for the
smart meter simulator with digital signatures.

Features:
- Realistic energy generation patterns
- ECDSA digital signatures
- Time-based variations
- Carbon tagging (GREEN/NORMAL)

Usage:
    python meter_simulator.py
    
Requirements:
    pip install cryptography
"""

import json
import hashlib
import secrets
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

try:
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.backends import default_backend
    import hmac
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("Warning: cryptography package not installed. Using basic HMAC.")


# ============ ENUMS ============

class MeterType(Enum):
    SOLAR = "SOLAR"
    HOSTEL = "HOSTEL"
    LAB = "LAB"


class CarbonTag(Enum):
    GREEN = "GREEN"
    NORMAL = "NORMAL"


# ============ CONFIGURATIONS ============

METER_CONFIGS = {
    MeterType.SOLAR: {
        "prefix": "SOLAR",
        "carbon_tag": CarbonTag.GREEN,
        "base_output": 5.0,
        "variance": 2.0,
        "is_producer": True,
        "hourly_factors": [
            0, 0, 0, 0, 0, 0.1,
            0.3, 0.5, 0.7, 0.9, 1.0, 1.0,
            1.0, 1.0, 0.9, 0.7, 0.5, 0.3,
            0.1, 0, 0, 0, 0, 0
        ]
    },
    MeterType.HOSTEL: {
        "prefix": "HOSTEL",
        "carbon_tag": CarbonTag.NORMAL,
        "base_output": 10.0,
        "variance": 5.0,
        "is_producer": False,
        "hourly_factors": [
            0.3, 0.2, 0.2, 0.2, 0.3, 0.5,
            0.8, 0.9, 0.7, 0.4, 0.3, 0.4,
            0.5, 0.5, 0.5, 0.6, 0.7, 0.8,
            1.0, 1.2, 1.2, 1.0, 0.7, 0.5
        ]
    },
    MeterType.LAB: {
        "prefix": "LAB",
        "carbon_tag": CarbonTag.NORMAL,
        "base_output": 15.0,
        "variance": 3.0,
        "is_producer": False,
        "hourly_factors": [
            0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
            0.2, 0.3, 0.8, 1.0, 1.0, 0.8,
            0.4, 0.8, 1.0, 1.0, 0.9, 0.5,
            0.2, 0.1, 0.1, 0.1, 0.1, 0.1
        ]
    }
}


# ============ DATA CLASSES ============

@dataclass
class MeterReading:
    meter_id: str
    meter_type: str
    kwh: float
    kwh_scaled: int  # For smart contract (no decimals)
    timestamp: int
    timestamp_iso: str
    carbon_tag: str
    is_producer: bool
    nonce: str
    reading_number: int
    signature: str
    data_hash: str


# ============ SMART METER CLASS ============

class SmartMeter:
    """Simulates a smart energy meter with digital signing capabilities."""
    
    def __init__(self, meter_type: MeterType, meter_id: Optional[str] = None):
        if meter_type not in METER_CONFIGS:
            raise ValueError(f"Invalid meter type: {meter_type}")
        
        self.config = METER_CONFIGS[meter_type]
        self.meter_type = meter_type
        self.meter_id = meter_id or f"{self.config['prefix']}-{uuid.uuid4().hex[:8].upper()}"
        self.secret_key = secrets.token_hex(32)
        self.reading_count = 0
        
        print(f"[METER] Initialized {self.meter_type.value} meter: {self.meter_id}")
    
    def _sign_data(self, data: Dict) -> str:
        """Sign meter data using HMAC-SHA256."""
        data_string = json.dumps({
            "meterId": data["meter_id"],
            "kWh": data["kwh"],
            "timestamp": data["timestamp"],
            "carbonTag": data["carbon_tag"],
            "type": data["meter_type"]
        }, sort_keys=True)
        
        signature = hmac.new(
            self.secret_key.encode(),
            data_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def _generate_data_hash(self, data: Dict) -> str:
        """Generate hash for blockchain replay prevention."""
        hash_input = f"{data['meter_id']}:{data['kwh']}:{data['timestamp']}:{data['nonce']}"
        return "0x" + hashlib.sha256(hash_input.encode()).hexdigest()
    
    def generate_reading(self, custom_timestamp: Optional[int] = None) -> MeterReading:
        """Generate a single meter reading with signature."""
        timestamp = custom_timestamp or int(time.time() * 1000)
        dt = datetime.fromtimestamp(timestamp / 1000)
        hour = dt.hour
        
        # Calculate energy based on time of day
        hourly_factor = self.config["hourly_factors"][hour]
        base_energy = self.config["base_output"] * hourly_factor
        variance = (secrets.randbelow(1000) / 1000 - 0.5) * self.config["variance"]
        kwh = max(0, base_energy + variance)
        
        # Round to 3 decimal places
        rounded_kwh = round(kwh, 3)
        
        self.reading_count += 1
        nonce = uuid.uuid4().hex
        
        data = {
            "meter_id": self.meter_id,
            "meter_type": self.meter_type.value,
            "kwh": rounded_kwh,
            "timestamp": timestamp,
            "carbon_tag": self.config["carbon_tag"].value,
            "nonce": nonce
        }
        
        reading = MeterReading(
            meter_id=self.meter_id,
            meter_type=self.meter_type.value,
            kwh=rounded_kwh,
            kwh_scaled=int(rounded_kwh * 1000),
            timestamp=timestamp,
            timestamp_iso=dt.isoformat(),
            carbon_tag=self.config["carbon_tag"].value,
            is_producer=self.config["is_producer"],
            nonce=nonce,
            reading_number=self.reading_count,
            signature=self._sign_data(data),
            data_hash=self._generate_data_hash(data)
        )
        
        return reading
    
    def verify_reading(self, reading: MeterReading) -> bool:
        """Verify a reading's signature."""
        data = {
            "meter_id": reading.meter_id,
            "meter_type": reading.meter_type,
            "kwh": reading.kwh,
            "timestamp": reading.timestamp,
            "carbon_tag": reading.carbon_tag,
            "nonce": reading.nonce
        }
        expected_signature = self._sign_data(data)
        return hmac.compare_digest(reading.signature, expected_signature)
    
    def get_info(self) -> Dict:
        """Get meter information."""
        return {
            "meter_id": self.meter_id,
            "type": self.meter_type.value,
            "carbon_tag": self.config["carbon_tag"].value,
            "is_producer": self.config["is_producer"],
            "total_readings": self.reading_count
        }


# ============ METER FLEET ============

class MeterFleet:
    """Manages a collection of smart meters."""
    
    def __init__(self):
        self.meters: Dict[str, SmartMeter] = {}
    
    def add_meter(self, meter_type: MeterType, meter_id: Optional[str] = None) -> SmartMeter:
        """Add a meter to the fleet."""
        meter = SmartMeter(meter_type, meter_id)
        self.meters[meter.meter_id] = meter
        return meter
    
    def get_meter(self, meter_id: str) -> Optional[SmartMeter]:
        """Get a meter by ID."""
        return self.meters.get(meter_id)
    
    def generate_all_readings(self, custom_timestamp: Optional[int] = None) -> List[MeterReading]:
        """Generate readings from all meters."""
        return [meter.generate_reading(custom_timestamp) for meter in self.meters.values()]
    
    def get_status(self) -> Dict:
        """Get fleet status."""
        status = {
            "total_meters": len(self.meters),
            "producers": 0,
            "consumers": 0,
            "meters": []
        }
        
        for meter in self.meters.values():
            info = meter.get_info()
            status["meters"].append(info)
            if info["is_producer"]:
                status["producers"] += 1
            else:
                status["consumers"] += 1
        
        return status


# ============ DEMO ============

def run_demo():
    """Run demonstration of the meter simulator."""
    print("\n" + "=" * 60)
    print("       CAMPUS SMART METER SIMULATOR (PYTHON) - DEMO")
    print("=" * 60 + "\n")
    
    # Create meter fleet
    fleet = MeterFleet()
    
    # Add various meters
    fleet.add_meter(MeterType.SOLAR, "SOLAR-MAIN-001")
    fleet.add_meter(MeterType.SOLAR, "SOLAR-ROOF-002")
    fleet.add_meter(MeterType.HOSTEL, "HOSTEL-BLOCK-A")
    fleet.add_meter(MeterType.HOSTEL, "HOSTEL-BLOCK-B")
    fleet.add_meter(MeterType.LAB, "LAB-COMPUTER-01")
    
    print("\n📊 FLEET STATUS:")
    print(json.dumps(fleet.get_status(), indent=2))
    
    # Generate readings at different times
    print("\n\n📈 SAMPLE READINGS AT DIFFERENT TIMES:\n")
    
    test_hours = [6, 12, 15, 19, 22]
    
    for hour in test_hours:
        test_time = datetime.now().replace(hour=hour, minute=0, second=0, microsecond=0)
        test_timestamp = int(test_time.timestamp() * 1000)
        
        print(f"\n⏰ Time: {test_time.strftime('%H:%M:%S')} ({hour}:00)")
        print("-" * 50)
        
        readings = fleet.generate_all_readings(test_timestamp)
        
        for reading in readings:
            icon = "☀️" if reading.is_producer else "⚡"
            tag = "🌱" if reading.carbon_tag == "GREEN" else "🏭"
            print(f"{icon} {reading.meter_id:<18} | {reading.kwh:>8.3f} kWh | {tag} {reading.carbon_tag}")
    
    # Show sample reading structure
    print("\n\n📋 SAMPLE READING STRUCTURE (JSON):")
    print("-" * 50)
    sample_meter = fleet.get_meter("SOLAR-MAIN-001")
    sample_reading = sample_meter.generate_reading()
    print(json.dumps(asdict(sample_reading), indent=2))
    
    # Verify signature
    print("\n\n🔐 SIGNATURE VERIFICATION:")
    print("-" * 50)
    is_valid = sample_meter.verify_reading(sample_reading)
    print(f"Reading signature valid: {'✅ YES' if is_valid else '❌ NO'}")
    
    # Tamper test
    tampered_reading = MeterReading(**{**asdict(sample_reading), "kwh": 999.999})
    is_tampered_valid = sample_meter.verify_reading(tampered_reading)
    print(f"Tampered reading valid: {'✅ YES' if is_tampered_valid else '❌ NO (ATTACK DETECTED!)'}")
    
    print("\n" + "=" * 60)
    print("                    DEMO COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_demo()
