import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Brand mark for Happy Talk.
///
/// Soft pastel disc with a crescent inside (the calm) and a sparkle near
/// the top-right (the moment of softness). Painted, so it scales perfectly
/// at any size with no asset weight.
class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.size = 96, this.showShadow = true});

  final double size;
  final bool showShadow;

  @override
  Widget build(BuildContext context) {
    final disc = SizedBox.square(
      dimension: size,
      child: CustomPaint(painter: _LogoPainter()),
    );

    if (!showShadow) return disc;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppPalette.ink.withOpacity(0.10),
            blurRadius: 24,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: disc,
    );
  }
}

class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final r = size.width / 2;
    final center = Offset(r, r);

    // Outer pastel disc.
    final discRect = Rect.fromCircle(center: center, radius: r);
    canvas.drawCircle(
      center,
      r,
      Paint()
        ..shader = const RadialGradient(
          center: Alignment(-0.2, -0.25),
          radius: 0.95,
          colors: [
            Color(0xFFFFF1FA),
            Color(0xFFE6DCFF),
            Color(0xFFD6E8D2),
          ],
          stops: [0.0, 0.55, 1.0],
        ).createShader(discRect),
    );

    // Inner highlight ring for that soft glass feel.
    canvas.drawCircle(
      center,
      r - 1,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = Colors.white.withOpacity(0.45),
    );

    // Crescent moon (the brand mark): two overlapping circles, even-odd fill.
    final crescentR = r * 0.46;
    final crescent = Path()
      ..fillType = PathFillType.evenOdd
      ..addOval(Rect.fromCircle(
        center: center.translate(-r * 0.04, r * 0.06),
        radius: crescentR,
      ))
      ..addOval(Rect.fromCircle(
        center: center.translate(r * 0.18, -r * 0.04),
        radius: crescentR,
      ));
    canvas.drawPath(
      crescent,
      Paint()..color = AppPalette.ink.withOpacity(0.92),
    );

    // Sparkle near the top-right, just inside the disc.
    final sparkleCenter = center.translate(r * 0.55, -r * 0.55);
    final sp = r * 0.13;
    final sparkle = Path()
      ..moveTo(sparkleCenter.dx, sparkleCenter.dy - sp)
      ..lineTo(sparkleCenter.dx + sp * 0.32, sparkleCenter.dy - sp * 0.32)
      ..lineTo(sparkleCenter.dx + sp, sparkleCenter.dy)
      ..lineTo(sparkleCenter.dx + sp * 0.32, sparkleCenter.dy + sp * 0.32)
      ..lineTo(sparkleCenter.dx, sparkleCenter.dy + sp)
      ..lineTo(sparkleCenter.dx - sp * 0.32, sparkleCenter.dy + sp * 0.32)
      ..lineTo(sparkleCenter.dx - sp, sparkleCenter.dy)
      ..lineTo(sparkleCenter.dx - sp * 0.32, sparkleCenter.dy - sp * 0.32)
      ..close();
    canvas.drawPath(sparkle, Paint()..color = AppPalette.accent);
  }

  @override
  bool shouldRepaint(covariant _LogoPainter oldDelegate) => false;
}
