import wave
import math
import struct
import os

sample_rate = 44100.0

def append_tone(wavef, duration_seconds, freq=880.0, volume=32767.0):
    for i in range(int(duration_seconds * sample_rate)):
        # Sine wave
        value = int(volume * math.sin(2.0 * math.pi * freq * (i / sample_rate)))
        # Apply slight envelope to prevent clicking
        if i < 500:
            value = int(value * (i / 500.0))
        elif i > int(duration_seconds * sample_rate) - 500:
            value = int(value * ((int(duration_seconds * sample_rate) - i) / 500.0))
        data = struct.pack('<h', value)
        wavef.writeframesraw(data)

def append_silence(wavef, duration_seconds):
    for i in range(int(duration_seconds * sample_rate)):
        data = struct.pack('<h', 0)
        wavef.writeframesraw(data)

os.makedirs('android/app/src/main/res/raw', exist_ok=True)
wavef = wave.open('android/app/src/main/res/raw/alert.wav', 'w')
wavef.setnchannels(1) # mono
wavef.setsampwidth(2) 
wavef.setframerate(sample_rate)

# Double beep pattern (880Hz)
append_tone(wavef, 0.1, freq=880.0, volume=20000.0)
append_silence(wavef, 0.05)
append_tone(wavef, 0.2, freq=880.0, volume=20000.0)
append_silence(wavef, 0.2)

# Double beep pattern (880Hz)
append_tone(wavef, 0.1, freq=880.0, volume=20000.0)
append_silence(wavef, 0.05)
append_tone(wavef, 0.2, freq=880.0, volume=20000.0)
append_silence(wavef, 0.5)

wavef.writeframes(b'')
wavef.close()

print("Generated alert.wav successfully!")
