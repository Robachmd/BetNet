// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Amharic (`am`).
class AppLocalizationsAm extends AppLocalizations {
  AppLocalizationsAm([String locale = 'am']) : super(locale);

  @override
  String get appTitle => 'BetNet';

  @override
  String get browse => 'ይፈልጉ';

  @override
  String get saved => 'የተቀመጡ';

  @override
  String get chat => 'ውይይት';

  @override
  String get alerts => 'ማስታወቂያዎች';

  @override
  String get profile => 'መገለጫ';

  @override
  String get logIn => 'ግባ';

  @override
  String get eventHalls => 'የሃል ክፍሎች';

  @override
  String get floorNumberLabel => 'የመኖሪያ ወለል';

  @override
  String get floorNumberHint => 'ለምሳሌ 3 (መሬት = 0)';

  @override
  String get floorNumberHelp => 'የክፍል ወይም የሱቅ ወለል (0–200)። አማራጭ።';

  @override
  String floorMeta(int n) {
    return 'ወለል $n';
  }
}
