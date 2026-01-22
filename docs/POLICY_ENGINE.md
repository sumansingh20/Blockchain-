# ============================================
# POLICY ENGINE DOCUMENTATION
# ============================================

## Pricing Formula

```
Final Price = (BaseRate × kWh × TimeMultiplier) - GreenDiscount
```

## Configuration Parameters

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| BASE_RATE_PER_KWH | 500 paise (₹5) | Base price per kWh |
| PEAK_HOUR_START | 18 (6 PM) | Peak period start |
| PEAK_HOUR_END | 21 (9 PM) | Peak period end |
| PEAK_MULTIPLIER | 1.5 | Peak hour price multiplier |
| GREEN_DISCOUNT | 0.10 (10%) | Discount for renewable energy |

## Time-of-Use (ToU) Pricing

### Peak Hours: 18:00 - 21:00
- High demand period
- 1.5x multiplier applied
- Encourages load shifting

### Off-Peak Hours: All other times
- Standard pricing
- 1.0x multiplier

## Carbon Tag Discounts

### GREEN Energy
- Solar, wind, renewable sources
- 10% discount from final price
- Encourages renewable adoption

### NORMAL Energy
- Grid power, conventional
- No discount

## Calculation Examples

### Example 1: Off-Peak GREEN
```
Input:  10 kWh at 10:00 AM, GREEN tag
        Base = 500 × 10 = 5000 paise
        Time = 5000 × 1.0 = 5000 paise (off-peak)
        Discount = 5000 × 0.10 = 500 paise
        Final = 5000 - 500 = 4500 paise = ₹45.00
```

### Example 2: Peak NORMAL
```
Input:  10 kWh at 7:00 PM, NORMAL tag
        Base = 500 × 10 = 5000 paise
        Time = 5000 × 1.5 = 7500 paise (peak)
        Discount = 7500 × 0.00 = 0 paise
        Final = 7500 - 0 = 7500 paise = ₹75.00
```

### Example 3: Peak GREEN
```
Input:  10 kWh at 8:00 PM, GREEN tag
        Base = 500 × 10 = 5000 paise
        Time = 5000 × 1.5 = 7500 paise (peak)
        Discount = 7500 × 0.10 = 750 paise
        Final = 7500 - 750 = 6750 paise = ₹67.50
```

## Configuration via Environment

Edit `.env` file:
```
BASE_RATE_PER_KWH=500
PEAK_MULTIPLIER=1.5
PEAK_HOUR_START=18
PEAK_HOUR_END=21
GREEN_DISCOUNT=0.10
```

## API Usage

### Get Current Policy
```
GET /api/policy/config
```

### Calculate Price
```
POST /api/policy/calculate
{
  "kWh": 10,
  "timestamp": 1706012400000,
  "carbonTag": "GREEN"
}
```

Response includes full breakdown with formula explanation.
