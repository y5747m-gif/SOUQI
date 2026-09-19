#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
رسم أيقونة سوقي | SOUQI كصورة PNG (حقيبة تسوّق مصرية: حقيبة + هرم + نيل + شمس)
نفس تصميم الأيقونة SVG المستخدمة في الموقع، لإنتاج أيقونة تطبيق جاهزة للاستورز.
"""
from PIL import Image, ImageDraw
import math, os

SS = 4                 # تكبير للتنعيم (supersampling)
BASE = 512
U = BASE * SS / 64.0   # بيكسل لكل وحدة في viewBox 64

def P(v): return v * U

def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient(w, h, c1, c2, x1=0.5, y1=0.0, x2=0.5, y2=1.0):
    img = Image.new('RGB', (w, h), c1)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=lerp(c1, c2, t))
    return img

def rounded_mask(w, h, box, radius, ss_scale=1):
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=255)
    return m

def bezier(p0, p1, p2, p3, n=80):
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

W = H = int(64 * U)
canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))

# ---------- 1) الخلفية البرجاندي ----------
bg = gradient(W, H, (142, 0, 36), (72, 0, 18)).convert('RGBA')
mask = rounded_mask(W, H, [0, 0, W - 1, H - 1], P(15))
canvas.paste(bg, (0, 0), mask)

# ---------- 2) شمس مصر (أعلى اليمين) ----------
sun_c = (P(50.2), P(14.6)); sun_r = P(5.6)
sun = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(sun)
sd.ellipse([sun_c[0]-sun_r, sun_c[1]-sun_r, sun_c[0]+sun_r, sun_c[1]+sun_r], fill=(246, 206, 150, 255))
hl = P(2.7)
sd.ellipse([sun_c[0]-hl-P(1.2), sun_c[1]-hl-P(1.6), sun_c[0]+hl-P(1.2), sun_c[1]+hl-P(1.6)], fill=(255, 227, 184, 255))
canvas.alpha_composite(sun)

# ---------- 3) مقبض الحقيبة ----------
handle = Image.new('RGBA', (W, H), (0, 0, 0, 0))
hd = ImageDraw.Draw(handle)
pts = bezier((P(25.0), P(29.4)), (P(25.0), P(19.2)), (P(39.0), P(19.2)), (P(39.0), P(29.4)), 140)
half = P(1.7)
outer = [(x, y - half) for (x, y) in pts]
inner_p = [(x, y + half) for (x, y) in pts]
hd.polygon(outer + inner_p[::-1], fill=(255, 255, 255, 255))
canvas.alpha_composite(handle)

# ---------- 4) جسم الحقيبة ----------
body_box = [P(13), P(26.6), P(51), P(55)]
body_mask = rounded_mask(W, H, body_box, P(6))
body_img = gradient(W, H, (255, 255, 255), (247, 232, 237)).convert('RGBA')
canvas.paste(body_img, (0, 0), body_mask)

# ---------- 5) الهرم والنيل داخل الحقيبة (مقصوصة على شكل الحقيبة) ----------
inner = Image.new('RGBA', (W, H), (0, 0, 0, 0))
idr = ImageDraw.Draw(inner, 'RGBA')
# شمس الهرم (وردي فاتح) — أصغر وأعلى حتى لا تزحم الهرم
ic = (P(41.2), P(35.6)); ir = P(5.6)
idr.ellipse([ic[0]-ir, ic[1]-ir, ic[0]+ir, ic[1]+ir], fill=(247, 199, 213, 255))
# الهرم: وجهان بتباين واضح
apex = (P(27.2), P(31.2)); base_y = P(47.0); midx = P(27.2)
idr.polygon([apex, (P(17.8), base_y), (midx, base_y)], fill=(104, 0, 23, 255))      # الوجه الغربي (ظل)
idr.polygon([apex, (P(36.6), base_y), (midx, base_y)], fill=(178, 4, 48, 255))      # الوجه الشرقي (ضوء)
# خط السطح بين الوجهين
idr.line([apex, (midx, base_y)], fill=(232, 176, 194, 255), width=max(1, int(P(0.45))))
# النيل: شريط مموّج ناعم واحد + شريط رفيع تحته (موجة واحدة كاملة داخل الحقيبة)
def wave_band(cy, amp, thick, color, alpha=255, x0=13.0, x1=51.0, periods=1.75):
    n = 260
    top, bot = [], []
    for i in range(n + 1):
        t = i / n
        x = P(x0) + (P(x1) - P(x0)) * t
        y = P(cy) - amp * math.sin(t * periods * 2 * math.pi)
        top.append((x, y - thick / 2))
        bot.append((x, y + thick / 2))
    idr.polygon(top + bot[::-1], fill=color + (alpha,))
wave_band(49.8, P(1.05), P(2.4), (128, 0, 32), x0=13.2, x1=50.8)
wave_band(53.1, P(1.0), P(1.6), (178, 4, 48), alpha=95, x0=18.5, x1=46.0, periods=1.9)
canvas.paste(inner, (0, 0), body_mask)

# ---------- 5-ب) تحديد خفيف حول الحقيبة (يفصلها عن الخلفية والهرم) ----------
edge = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(edge).rounded_rectangle(body_box, radius=P(6), outline=(120, 0, 30, 46), width=max(1, int(P(0.55))))
canvas.alpha_composite(edge)

# ---------- 6) تصدير أحجام ----------
out = []
for size in (512, 256, 192, 180, 128, 64, 32):
    img = canvas.resize((size, size), Image.LANCZOS)
    name = 'souqi-icon-%d.png' % size
    img.save(name)
    out.append(name)
canvas.resize((512, 512), Image.LANCZOS).save('souqi-icon.png')
print('تم إنشاء:', ', '.join(out), '+ souqi-icon.png')
