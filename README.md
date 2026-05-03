# Happy Talk

> a softer way to talk to yourself

A Flutter app that gives you motivational prompts tuned to your personality —
calm, specific, kind reminders made to interrupt anxious spirals and
perfectionist loops.

## Quickstart

```bash
flutter create .          # generate platform folders (ios/, android/, etc.)
flutter pub get
flutter run
```

> The repository ships only with the cross-platform `lib/` source. Run
> `flutter create .` once after cloning to scaffold the platform projects.

## Project layout

```
lib/
├── main.dart                      # entrypoint
├── app.dart                       # MaterialApp + theme wiring
├── data/
│   ├── quiz_questions.dart        # 6-question quiz content
│   └── quotes_data.dart           # curated quote library
├── models/
│   ├── personality.dart           # 4 archetypes + metadata
│   ├── quiz_question.dart
│   └── quote.dart
├── screens/
│   ├── splash_screen.dart
│   ├── welcome_screen.dart
│   ├── quiz_screen.dart
│   ├── result_screen.dart
│   ├── home_screen.dart
│   └── favorites_screen.dart
├── services/
│   ├── personality_scorer.dart    # tally → winning type
│   ├── quote_service.dart         # filter + non-repeating shuffle
│   └── storage_service.dart       # shared_preferences wrapper
├── theme/
│   └── app_theme.dart             # palette, typography, gradients
└── widgets/
    ├── gradient_background.dart   # bg + radial blobs
    ├── primary_button.dart        # filled + outlined variants
    └── quote_card.dart            # the main hero card
```

## Principles

- **No spirals.** Quotes invite, never accuse.
- **Specific, not generic.** Quotes filtered by personality.
- **Quiet UI.** Pastel gradients, generous whitespace, no streaks.
- **Private by default.** All data on-device. No accounts, no analytics.

## Stack

| Layer    | Choice                                |
| -------- | ------------------------------------- |
| Framework | Flutter ≥ 3.19 (Dart ≥ 3.3)          |
| Material | Material 3                            |
| Fonts    | `google_fonts` (Fraunces + Plus Jakarta Sans) |
| Storage  | `shared_preferences`                  |
| Lints    | `flutter_lints`                       |
