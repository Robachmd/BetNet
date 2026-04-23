import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app.dart';
import 'core/config.dart';

/// BetNet entrypoint. Initializes Hive for offline listing cache.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox(AppConfig.hiveBoxName);
  runApp(const ProviderScope(child: BetNetApp()));
}
