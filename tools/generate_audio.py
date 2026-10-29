"""生成原创轻量音效，仅使用标准库；运行：python tools/generate_audio.py。"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'audio'
# 使用短音与五声音阶，避免尖锐噪声和突然的大音量。
CUES = {
    'start': (0.24, [(0, 523.25, 0.13), (0.10, 659.25, 0.14)], False),
    'hit': (0.08, [(0, 260, 0.08)], True),
    'defeat': (0.12, [(0, 392, 0.12)], True),
    'pickup': (0.10, [(0, 784, 0.10)], False),
    'upgrade': (0.55, [(0, 523.25, 0.25), (0.13, 659.25, 0.25), (0.27, 784, 0.28)], False),
    'choose': (0.18, [(0, 659.25, 0.10), (0.07, 784, 0.11)], False),
    'hurt': (0.18, [(0, 196, 0.18)], True),
    'win': (0.90, [(0, 523.25, 0.28), (0.17, 659.25, 0.28), (0.34, 784, 0.28), (0.51, 1046.5, 0.39)], False),
    'lose': (0.65, [(0, 523.25, 0.25), (0.19, 440, 0.25), (0.38, 392, 0.27)], False),
}

def generate():
    ROOT.mkdir(parents=True, exist_ok=True)
    for index, (name, (duration, notes, wooden)) in enumerate(CUES.items()):
        samples = [0.0] * int(RATE * duration)
        noise = random.Random(index)
        for start, frequency, length in notes:
            filtered = 0.0
            for i in range(int(RATE * length)):
                position = int(start * RATE) + i
                if position >= len(samples):
                    break
                t = i / RATE
                # 起落淡入淡出消除爆音，木质声用低通噪声与衰减正弦混合。
                edge = min(1.0, t / 0.006, (length - t) / 0.025)
                envelope = max(0.0, edge) * math.exp(-t * (32 if wooden else 7))
                filtered = filtered * 0.85 + noise.uniform(-1, 1) * 0.15
                tone = math.sin(2 * math.pi * frequency * t)
                body = 0.82 * tone + 0.12 * math.sin(2 * math.pi * frequency * 2 * t)
                if wooden:
                    body = 0.72 * tone + 0.28 * filtered
                samples[position] += body * envelope * 0.29
        peak = max(abs(value) for value in samples) or 1
        scale = min(1, 0.32 / peak)
        pcm = b''.join(struct.pack('<h', int(value * scale * 32767)) for value in samples)
        with wave.open(str(ROOT / (name + '.wav')), 'wb') as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(RATE)
            output.writeframes(pcm)
    print('Generated', len(CUES), 'original PCM sound effects')

if __name__ == '__main__':
    generate()
