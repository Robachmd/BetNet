import 'package:flutter/material.dart';

import '../../features/shell/main_shell_scaffold.dart';

/// Root shell after login bootstrap (bottom nav + drawer).
class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context) => const MainShellScaffold();
}
