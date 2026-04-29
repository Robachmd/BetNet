// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Oromo (`om`).
class AppLocalizationsOm extends AppLocalizations {
  AppLocalizationsOm([String locale = 'om']) : super(locale);

  @override
  String get appTitle => 'BetNet';

  @override
  String get browse => 'Barbaadi';

  @override
  String get saved => 'Olkaa\'ame';

  @override
  String get chat => 'Haasa\'u';

  @override
  String get alerts => 'Beeksisa';

  @override
  String get profile => 'Ibsa dhuunfaa';

  @override
  String get logIn => 'Seeni';

  @override
  String get eventHalls => 'Mana waligaltee';

  @override
  String get floorNumberLabel => 'Lisa bu\'uura';

  @override
  String get floorNumberHint => 'fakkaata 3 (lafa = 0)';

  @override
  String get floorNumberHelp => 'Lisa kuusaa ykn dukaanaa (0–200). Filannoo.';

  @override
  String floorMeta(int n) {
    return 'Lisa $n';
  }
}
