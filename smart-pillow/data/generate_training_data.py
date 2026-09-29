import random
import csv
import sys

random.seed(42)

# Generate 900 samples: 300 per class
rows = [["fsr1","fsr2","fsr3","fsr4","fsr5","fsr6","fsr7","fsr8","fsr9","label"]]

def noise(n=80):
    return random.gauss(0, n)

def clamp(v):
    return max(0, min(4095, v))

# Left: heavy on cols 0,3,6
for _ in range(300):
    row = [
        clamp(3200+noise()), clamp(1200+noise()), clamp(400+noise()),
        clamp(2900+noise()), clamp(1100+noise()), clamp(350+noise()),
        clamp(3100+noise()), clamp(1100+noise()), clamp(380+noise()),
        "Left"
    ]
    rows.append(row)

# Right: heavy on cols 2,5,8
for _ in range(300):
    row = [
        clamp(400+noise()), clamp(1200+noise()), clamp(3200+noise()),
        clamp(350+noise()), clamp(1100+noise()), clamp(2900+noise()),
        clamp(380+noise()), clamp(1100+noise()), clamp(3100+noise()),
        "Right"
    ]
    rows.append(row)

# Back: heavy on center cols 1,4,7
for _ in range(300):
    row = [
        clamp(1200+noise()), clamp(2800+noise()), clamp(1200+noise()),
        clamp(1100+noise()), clamp(3100+noise()), clamp(1100+noise()),
        clamp(1000+noise()), clamp(2600+noise()), clamp(1000+noise()),
        "Back"
    ]
    rows.append(row)

with open(sys.argv[1] if len(sys.argv) > 1 else "position_training_data.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(rows)

print(f"Generated {len(rows)-1} training samples.")
