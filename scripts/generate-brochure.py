#!/usr/bin/env python3
"""
Cartelle — Plaquette commerciale bifold A4 (4 pages)
Generates a professional brochure PDF with all text content
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
import os

# Colors
TEAL = HexColor('#0F766E')
EMERALD = HexColor('#10B981')
DARK = HexColor('#0A1A14')
LIGHT_TEAL = HexColor('#CCFBF1')
GRAY_50 = HexColor('#F9FAFB')
GRAY_100 = HexColor('#F3F4F6')
GRAY_500 = HexColor('#6B7280')
GRAY_700 = HexColor('#374151')
GRAY_900 = HexColor('#111827')
GREEN_50 = HexColor('#F0FDF4')
AMBER = HexColor('#F59E0B')
WHITE = white

W, H = A4  # 210mm x 297mm

output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'plaquette-cartelle.pdf')

c = canvas.Canvas(output_path, pagesize=A4)
c.setTitle("Cartelle — Plaquette Commerciale")
c.setAuthor("Cartelle")
c.setSubject("Plaquette commerciale Cartelle - Fidélisation & Gamification")

# ============================================================================
# HELPERS
# ============================================================================

def draw_rounded_rect(c, x, y, w, h, r, fill_color=None, stroke_color=None):
    """Draw a rounded rectangle"""
    c.saveState()
    if fill_color:
        c.setFillColor(fill_color)
    if stroke_color:
        c.setStrokeColor(stroke_color)
    else:
        c.setStrokeColor(fill_color or white)
    p = c.beginPath()
    p.roundRect(x, y, w, h, r)
    p.close()
    if fill_color:
        c.drawPath(p, fill=1, stroke=0)
    else:
        c.drawPath(p, fill=0, stroke=1)
    c.restoreState()

def draw_gradient_rect(c, x, y, w, h, color1, color2, steps=50):
    """Simulate gradient with strips"""
    strip_h = h / steps
    for i in range(steps):
        r = color1.red + (color2.red - color1.red) * i / steps
        g = color1.green + (color2.green - color1.green) * i / steps
        b = color1.blue + (color2.blue - color1.blue) * i / steps
        c.setFillColorRGB(r, g, b)
        c.rect(x, y + h - (i + 1) * strip_h, w, strip_h + 0.5, fill=1, stroke=0)

def draw_bullet(c, x, y, text, font_size=9, color=GRAY_700):
    """Draw a bullet point"""
    c.setFillColor(EMERALD)
    c.setFont("Helvetica-Bold", font_size)
    c.drawString(x, y, "✓")
    c.setFillColor(color)
    c.setFont("Helvetica", font_size)
    c.drawString(x + 14, y, text)

def draw_stat_box(c, x, y, value, label, w=80, h=55):
    """Draw a stat card"""
    draw_rounded_rect(c, x, y, w, h, 6, fill_color=GREEN_50)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(x + w/2, y + h - 22, value)
    c.setFillColor(GRAY_500)
    c.setFont("Helvetica", 7)
    c.drawCentredString(x + w/2, y + 8, label)

# ============================================================================
# PAGE 1 — COUVERTURE (Face extérieure gauche du bifold)
# ============================================================================

# Full dark background
draw_gradient_rect(c, 0, 0, W, H, DARK, TEAL)

# Decorative circle (subtle)
c.setFillColor(HexColor('#10B98120'))
c.circle(W * 0.7, H * 0.7, 200, fill=1, stroke=0)
c.setFillColor(HexColor('#0F766E15'))
c.circle(W * 0.2, H * 0.3, 150, fill=1, stroke=0)

# Logo area
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 42)
c.drawCentredString(W/2, H - 200, "Cartelle")

# Tagline
c.setFont("Helvetica", 14)
c.setFillColor(HexColor('#A7F3D0'))  # emerald-200
c.drawCentredString(W/2, H - 230, "La plateforme de fidélisation")
c.drawCentredString(W/2, H - 248, "pour les commerces africains")

# Main visual area (placeholder text for design prompt)
draw_rounded_rect(c, 40, H/2 - 80, W - 80, 160, 16, fill_color=HexColor('#FFFFFF10'))
c.setFillColor(HexColor('#FFFFFF40'))
c.setFont("Helvetica", 9)
c.drawCentredString(W/2, H/2 + 40, "[VISUAL: Mockup iPhone + Roue + Carte fidélité + QR Code]")
c.drawCentredString(W/2, H/2 + 25, "Voir prompt de design ci-dessous")

# Headline
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 22)
c.drawCentredString(W/2, 220, "Vos clients reviennent.")
c.setFillColor(HexColor('#6EE7B7'))  # emerald-300
c.setFont("Helvetica-Bold", 22)
c.drawCentredString(W/2, 195, "Automatiquement.")

# Sub-headline
c.setFillColor(HexColor('#FFFFFF99'))
c.setFont("Helvetica", 10)
c.drawCentredString(W/2, 165, "Roue de la fortune  •  Carte fidélité digitale  •  Campagnes WhatsApp")
c.drawCentredString(W/2, 150, "QR Code  •  Avis Google  •  Automatisations intelligentes")

# Bottom bar
c.setFillColor(HexColor('#FFFFFF30'))
c.setFont("Helvetica", 8)
c.drawCentredString(W/2, 40, "www.cartelle.app  |  contact@cartelle.app  |  +241 XX XX XX XX")

# Stats bar
stat_y = 90
stat_w = 110
start_x = (W - stat_w * 3 - 30) / 2
for i, (val, lbl) in enumerate([
    ("+67%", "d'avis Google en plus"),
    ("+45%", "de clients fidélisés"),
    ("3 min", "pour tout configurer"),
]):
    sx = start_x + i * (stat_w + 15)
    draw_rounded_rect(c, sx, stat_y, stat_w, 45, 8, fill_color=HexColor('#FFFFFF15'))
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(sx + stat_w/2, stat_y + 25, val)
    c.setFillColor(HexColor('#FFFFFF80'))
    c.setFont("Helvetica", 7)
    c.drawCentredString(sx + stat_w/2, stat_y + 8, lbl)

c.showPage()

# ============================================================================
# PAGE 2 — INTÉRIEUR GAUCHE (Bénéfices + Comment ça marche)
# ============================================================================

# Light background
c.setFillColor(WHITE)
c.rect(0, 0, W, H, fill=1, stroke=0)

# Header bar
draw_gradient_rect(c, 0, H - 50, W, 50, TEAL, EMERALD)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 14)
c.drawCentredString(W/2, H - 33, "Pourquoi les commerces choisissent Cartelle")

# Section: 6 benefits
margin = 30
card_w = (W - margin * 3) / 2
card_h = 72
benefits = [
    ("📈", "Boostez votre CA", "Augmentez la fréquence des visites et le panier moyen grâce à la fidélisation gamifiée.", "+34% de CA"),
    ("⭐", "Avis Google explosés", "Vos clients satisfaits laissent automatiquement un avis 5 étoiles après avoir joué à la roue.", "+67% d'avis"),
    ("📸", "Followers Insta & TikTok", "Encouragez vos clients à vous suivre sur Instagram et TikTok après leur passage.", "+200% abonnés"),
    ("🎁", "Carte de fidélité digitale", "Carte avec points, paliers et récompenses. Vos clients cumulent à chaque visite.", "×2.5 rétention"),
    ("💬", "Marketing WhatsApp", "Campagnes ciblées envoyées directement sur le téléphone. 98% de taux d'ouverture.", "92% d'ouverture"),
    ("📱", "Zéro installation", "Vos clients scannent un QR code. Pas d'app à télécharger, zéro friction.", "15 sec pour jouer"),
]

for i, (emoji, title, desc, stat) in enumerate(benefits):
    col = i % 2
    row = i // 2
    x = margin + col * (card_w + margin)
    y = H - 80 - row * (card_h + 12) - 12

    draw_rounded_rect(c, x, y, card_w, card_h, 8, fill_color=GRAY_50)

    # Emoji
    c.setFont("Helvetica", 18)
    c.drawString(x + 10, y + card_h - 25, emoji)

    # Title + stat
    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 35, y + card_h - 22, title)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(x + card_w - 10, y + card_h - 22, stat)

    # Description (wrapped manually)
    c.setFillColor(GRAY_500)
    c.setFont("Helvetica", 7)
    words = desc.split()
    line = ""
    line_y = y + card_h - 38
    for word in words:
        test = line + " " + word if line else word
        if c.stringWidth(test, "Helvetica", 7) > card_w - 45:
            c.drawString(x + 35, line_y, line)
            line = word
            line_y -= 10
        else:
            line = test
    if line:
        c.drawString(x + 35, line_y, line)

# Section: Comment ça marche
section_y = H - 345
c.setFillColor(TEAL)
c.setFont("Helvetica-Bold", 13)
c.drawString(margin, section_y, "Comment ça marche ?")

steps = [
    ("01", "Créez votre compte", "Inscrivez-vous en 2 min. Personnalisez votre roue, vos lots et votre carte fidélité."),
    ("02", "Déployez le QR Code", "Imprimez votre QR code et placez-le sur vos tables, comptoir ou vitrine."),
    ("03", "Engagez & fidélisez", "Vos clients jouent, cumulent des points, laissent des avis. Tout remonte dans votre dashboard."),
    ("04", "Analysez & optimisez", "Suivez vos métriques en temps réel. Ajustez votre stratégie en un clic."),
]

for i, (num, title, desc) in enumerate(steps):
    y = section_y - 30 - i * 52

    # Step number circle
    c.setFillColor(TEAL)
    c.circle(margin + 15, y + 15, 13, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(margin + 15, y + 11, num)

    # Title
    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(margin + 38, y + 20, title)

    # Description
    c.setFillColor(GRAY_500)
    c.setFont("Helvetica", 7.5)
    c.drawString(margin + 38, y + 6, desc)

    # Connecting line
    if i < 3:
        c.setStrokeColor(LIGHT_TEAL)
        c.setLineWidth(1)
        c.line(margin + 15, y - 2, margin + 15, y - 22)

# Section: Automatisations
auto_y = 120
draw_rounded_rect(c, margin, auto_y - 10, W - margin * 2, 100, 10, fill_color=HexColor('#F5F3FF'))  # purple-50

c.setFillColor(HexColor('#7C3AED'))
c.setFont("Helvetica-Bold", 10)
c.drawString(margin + 12, auto_y + 72, "⚡ Automatisations intelligentes")

c.setFillColor(GRAY_700)
c.setFont("Helvetica", 7.5)
autos = [
    "🎂  Message d'anniversaire automatique à vos clients fidèles",
    "👋  Rappel de visite quand un client ne revient plus depuis 30 jours",
    "🏆  Félicitation automatique quand un palier de points est atteint",
    "⏰  Rappel avant expiration d'un coupon gagné à la roue",
]
for i, auto in enumerate(autos):
    c.drawString(margin + 15, auto_y + 52 - i * 14, auto)

# Footer
c.setFillColor(GRAY_500)
c.setFont("Helvetica", 6)
c.drawCentredString(W/2, 15, "Cartelle — La fidélisation, sans friction.")

c.showPage()

# ============================================================================
# PAGE 3 — INTÉRIEUR DROIT (WhatsApp + Tarifs)
# ============================================================================

c.setFillColor(WHITE)
c.rect(0, 0, W, H, fill=1, stroke=0)

# Header
draw_gradient_rect(c, 0, H - 50, W, 50, HexColor('#166534'), HexColor('#15803D'))
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 14)
c.drawCentredString(W/2, H - 33, "Campagnes WhatsApp — Parlez à vos clients")

# WhatsApp section
y = H - 80

# Stats row
stat_items = [
    ("98%", "Taux d'ouverture", "vs 20% email"),
    ("45%", "Taux de clic", "vs 2-5% email"),
    ("×3", "Plus de conversions", "vs pub Facebook"),
    ("5×", "Moins cher", "que Google Ads"),
]
stat_box_w = (W - margin * 2 - 30) / 4
for i, (val, lbl, sub) in enumerate(stat_items):
    sx = margin + i * (stat_box_w + 10)
    draw_rounded_rect(c, sx, y - 55, stat_box_w, 50, 6, fill_color=GREEN_50)
    c.setFillColor(HexColor('#166534'))
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(sx + stat_box_w/2, y - 22, val)
    c.setFillColor(GRAY_500)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(sx + stat_box_w/2, y - 36, lbl)
    c.setFillColor(GRAY_500)
    c.setFont("Helvetica", 5.5)
    c.drawCentredString(sx + stat_box_w/2, y - 47, sub)

# Key arguments
arg_y = y - 80
c.setFillColor(GRAY_900)
c.setFont("Helvetica-Bold", 9)
c.drawString(margin, arg_y, "Vos destinataires vous connaissent déjà :")

args = [
    "✓  Audience 100% opt-in — clients qui ont scanné votre QR code",
    "✓  Boutons cliquables vers votre site, menu, page de réservation",
    "✓  Messages riches : texte, image, vidéo + boutons d'action",
    "✓  Rapports en temps réel : délivrance, ouverture, clics",
]
c.setFillColor(GRAY_700)
c.setFont("Helvetica", 8)
for i, arg in enumerate(args):
    c.drawString(margin + 5, arg_y - 18 - i * 14, arg)

# Forfaits crédits
credit_y = arg_y - 95
c.setFillColor(TEAL)
c.setFont("Helvetica-Bold", 10)
c.drawString(margin, credit_y, "Forfaits Crédits Campagne (1 crédit = 1 message)")

packs = [
    ("100 crédits", "8 000 F", "80 F/msg"),
    ("500 crédits", "30 000 F", "60 F/msg"),
    ("1 000 crédits", "50 000 F", "50 F/msg"),
    ("5 000 crédits", "200 000 F", "40 F/msg"),
]
pack_w = (W - margin * 2 - 30) / 4
for i, (name, price, unit) in enumerate(packs):
    px = margin + i * (pack_w + 10)
    py = credit_y - 55
    draw_rounded_rect(c, px, py, pack_w, 45, 6, fill_color=GRAY_50)
    c.setFillColor(GRAY_900)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(px + pack_w/2, py + 30, name)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(px + pack_w/2, py + 15, price)
    c.setFillColor(GRAY_500)
    c.setFont("Helvetica", 6)
    c.drawCentredString(px + pack_w/2, py + 5, unit)

# ── TARIFS ABONNEMENT ──
tarif_y = credit_y - 120
c.setFillColor(TEAL)
c.setFont("Helvetica-Bold", 13)
c.drawCentredString(W/2, tarif_y, "Tarifs simples et transparents")
c.setFillColor(GRAY_500)
c.setFont("Helvetica", 8)
c.drawCentredString(W/2, tarif_y - 15, "14 jours d'essai gratuit  •  Sans engagement  •  Pas de frais cachés")

plans = [
    ("Découverte", "Gratuit", "14 jours", ["1 établissement", "Roue de la fortune", "QR Code perso", "Stats de base", "Support email"], False),
    ("Essentiel", "10 000 F", "/mois", ["1 établissement", "Roue + Carte fidélité", "Stats avancées", "Campagnes WhatsApp", "Support prioritaire"], True),
    ("Premium", "25 000 F", "/mois", ["3 établissements", "Toutes fonctionnalités", "Branding perso", "Wallet Apple/Google", "Gestionnaire dédié"], False),
    ("Sur mesure", "Devis", "", ["Sites illimités", "API & intégrations", "White label", "SLA garanti", "Formation équipes"], False),
]

plan_w = (W - margin * 2 - 24) / 4
plan_h = 155
plan_y = tarif_y - 35 - plan_h

for i, (name, price, period, features, popular) in enumerate(plans):
    px = margin + i * (plan_w + 8)

    if popular:
        draw_rounded_rect(c, px - 2, plan_y - 2, plan_w + 4, plan_h + 14, 8, fill_color=DARK)
        # Popular badge
        draw_rounded_rect(c, px + 5, plan_y + plan_h + 1, plan_w - 10, 12, 4, fill_color=EMERALD)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 5.5)
        c.drawCentredString(px + plan_w/2, plan_y + plan_h + 4, "LE PLUS POPULAIRE")
        text_color = WHITE
        feat_color = HexColor('#FFFFFFB0')
    else:
        draw_rounded_rect(c, px, plan_y, plan_w, plan_h, 8, fill_color=GRAY_50)
        text_color = GRAY_900
        feat_color = GRAY_500

    # Plan name
    c.setFillColor(text_color)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(px + 8, plan_y + plan_h - 18, name)

    # Price
    c.setFont("Helvetica-Bold", 14)
    c.drawString(px + 8, plan_y + plan_h - 38, price)
    if period:
        c.setFont("Helvetica", 6)
        c.setFillColor(feat_color)
        c.drawString(px + 8 + c.stringWidth(price, "Helvetica-Bold", 14) + 2, plan_y + plan_h - 36, period)

    # Features
    c.setFillColor(feat_color)
    c.setFont("Helvetica", 6.5)
    for fi, feat in enumerate(features):
        c.drawString(px + 10, plan_y + plan_h - 55 - fi * 12, f"✓ {feat}")

# Footer
c.setFillColor(GRAY_500)
c.setFont("Helvetica", 6)
c.drawCentredString(W/2, 15, "Cartelle — Tous les prix sont en FCFA, hors taxes.")

c.showPage()

# ============================================================================
# PAGE 4 — DOS (Face extérieure droite du bifold)
# ============================================================================

# Full dark background
draw_gradient_rect(c, 0, 0, W, H, TEAL, DARK)

# Top section: CTA
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 24)
c.drawCentredString(W/2, H - 120, "Prêt à fidéliser")
c.setFillColor(HexColor('#6EE7B7'))
c.drawCentredString(W/2, H - 150, "vos clients ?")

c.setFillColor(HexColor('#FFFFFF80'))
c.setFont("Helvetica", 11)
c.drawCentredString(W/2, H - 185, "Essayez Cartelle gratuitement pendant 14 jours.")
c.drawCentredString(W/2, H - 200, "Sans carte bancaire. Sans engagement.")

# Benefits list
benefits_cta = [
    "✓  14 jours gratuits",
    "✓  Mise en place en 3 minutes",
    "✓  Accompagnement inclus",
    "✓  Sans engagement",
]
c.setFillColor(HexColor('#A7F3D0'))
c.setFont("Helvetica", 10)
for i, b in enumerate(benefits_cta):
    c.drawCentredString(W/2, H - 235 - i * 20, b)

# QR Code placeholder
draw_rounded_rect(c, W/2 - 60, H/2 - 40, 120, 120, 12, fill_color=WHITE)
c.setFillColor(GRAY_500)
c.setFont("Helvetica", 8)
c.drawCentredString(W/2, H/2 + 55, "[QR CODE]")
c.drawCentredString(W/2, H/2 + 40, "Scannez pour")
c.drawCentredString(W/2, H/2 + 28, "créer votre compte")
c.setFillColor(TEAL)
c.setFont("Helvetica-Bold", 7)
c.drawCentredString(W/2, H/2 - 20, "cartelle-production.up.railway.app/auth/signup")

# Parrainage section
ref_y = H/2 - 70
draw_rounded_rect(c, 40, ref_y, W - 80, 55, 10, fill_color=HexColor('#FFFFFF15'))
c.setFillColor(HexColor('#FCD34D'))
c.setFont("Helvetica-Bold", 10)
c.drawCentredString(W/2, ref_y + 35, "🎁 Programme de parrainage")
c.setFillColor(WHITE)
c.setFont("Helvetica", 8)
c.drawCentredString(W/2, ref_y + 18, "Parrainez un commerce → Vous gagnez tous les deux 50 crédits campagne !")
c.setFillColor(HexColor('#FFFFFF80'))
c.setFont("Helvetica", 7)
c.drawCentredString(W/2, ref_y + 5, "Chaque merchant reçoit un code de parrainage unique dans son dashboard.")

# Témoignages
temo_y = ref_y - 80
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 11)
c.drawCentredString(W/2, temo_y + 10, "Ils fidélisent avec Cartelle")

testimonials = [
    ("«Nos avis Google ont doublé en 3 semaines»", "Restaurant Le Baobab — Douala"),
    ("«La carte fidélité a transformé notre relation client»", "Hôtel Akwa Palace — Yaoundé"),
    ("«Le meilleur investissement marketing de l'année»", "Salon Beauté Divine — Dakar"),
]
c.setFont("Helvetica-Oblique", 8)
for i, (quote, author) in enumerate(testimonials):
    y = temo_y - 20 - i * 35
    c.setFillColor(HexColor('#D1FAE5'))
    c.drawCentredString(W/2, y, quote)
    c.setFillColor(HexColor('#FFFFFF60'))
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, y - 14, author)
    c.setFont("Helvetica-Oblique", 8)

# Contact info
contact_y = 80
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 10)
c.drawCentredString(W/2, contact_y + 20, "Contactez-nous")

c.setFillColor(HexColor('#FFFFFFB0'))
c.setFont("Helvetica", 9)
c.drawCentredString(W/2, contact_y, "📧  contact@cartelle.app")
c.drawCentredString(W/2, contact_y - 16, "📱  +241 XX XX XX XX")
c.drawCentredString(W/2, contact_y - 32, "🌐  www.cartelle.app")

# Copyright
c.setFillColor(HexColor('#FFFFFF40'))
c.setFont("Helvetica", 6)
c.drawCentredString(W/2, 20, "© 2026 Cartelle. Tous droits réservés. Libreville, Gabon.")

c.save()
print(f"PDF generated: {output_path}")
