// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'BetNet';

  @override
  String get browse => 'Browse';

  @override
  String get saved => 'Saved';

  @override
  String get chat => 'Chat';

  @override
  String get alerts => 'Alerts';

  @override
  String get profile => 'Profile';

  @override
  String get logIn => 'Log in';

  @override
  String get eventHalls => 'Event halls';

  @override
  String get floorNumberLabel => 'Floor number';

  @override
  String get floorNumberHint => 'e.g. 3 (ground = 0)';

  @override
  String get floorNumberHelp => 'Unit or shop floor (0–200). Optional.';

  @override
  String floorMeta(int n) {
    return 'Floor $n';
  }
}
