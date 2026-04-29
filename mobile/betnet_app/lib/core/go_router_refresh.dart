import 'package:flutter/material.dart';

/// Notifies [GoRouter] to re-evaluate redirects after auth changes.
class GoRouterRefresh extends ChangeNotifier {
  void refresh() => notifyListeners();
}

final goRouterRefresh = GoRouterRefresh();
