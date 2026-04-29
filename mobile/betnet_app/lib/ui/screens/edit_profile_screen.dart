import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/betnet_api.dart';
import '../widgets/app_primitives.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _email = TextEditingController();
  final _city = TextEditingController();
  final _subCity = TextEditingController();
  final _bio = TextEditingController();
  final _oldPass = TextEditingController();
  final _newPass = TextEditingController();
  final _newPass2 = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  bool _passBusy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).refreshProfile();
      final u = ref.read(authControllerProvider).user;
      if (u != null) {
        _first.text = u.firstName;
        _last.text = u.lastName;
        _email.text = u.email ?? '';
        _city.text = u.city ?? '';
        _subCity.text = u.subCity ?? '';
        _bio.text = u.bio ?? '';
      }
    } catch (e) {
      _error = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _email.dispose();
    _city.dispose();
    _subCity.dispose();
    _bio.dispose();
    _oldPass.dispose();
    _newPass.dispose();
    _newPass2.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    setState(() => _saving = true);
    try {
      final u = await ref.read(betNetApiProvider).patchProfile({
        'first_name': _first.text.trim(),
        'last_name': _last.text.trim(),
        'email': _email.text.trim(),
        'city': _city.text.trim(),
        'sub_city': _subCity.text.trim(),
        'bio': _bio.text.trim(),
      });
      ref.read(authControllerProvider.notifier).replaceUser(u);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickAvatar() async {
    final pick = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (pick == null) return;
    setState(() => _saving = true);
    try {
      final u = await ref.read(betNetApiProvider).patchProfileWithAvatar(
            fields: {
              'first_name': _first.text.trim(),
              'last_name': _last.text.trim(),
            },
            filePath: pick.path,
            filename: pick.name,
          );
      ref.read(authControllerProvider.notifier).replaceUser(u);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Photo updated')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    if (_newPass.text != _newPass2.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('New passwords do not match')),
      );
      return;
    }
    setState(() => _passBusy = true);
    try {
      await ref.read(betNetApiProvider).changePassword(
            oldPassword: _oldPass.text,
            newPassword: _newPass.text,
            newPasswordConfirm: _newPass2.text,
          );
      _oldPass.clear();
      _newPass.clear();
      _newPass2.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password changed')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _passBusy = false);
    }
  }

  Future<void> _becomeOwner() async {
    try {
      final u = await ref.read(betNetApiProvider).enablePropertyOwner();
      ref.read(authControllerProvider.notifier).replaceUser(u);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('You can now use property owner tools')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  Future<void> _setAppMode(String mode) async {
    try {
      final u = await ref.read(betNetApiProvider).patchProfile({'active_app_mode': mode});
      ref.read(authControllerProvider.notifier).replaceUser(u);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Switched to $mode mode')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final u = auth.user;

    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Account')),
        body: const LoadingState(),
      );
    }
    if (_error != null && u == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Account')),
        body: ErrorState(message: _error!, onRetry: _load),
      );
    }
    if (u == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Account')),
        body: const Center(child: Text('Sign in required')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'Profile',
            child: Column(
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    onPressed: _saving ? null : _pickAvatar,
                    icon: const Icon(Icons.photo_camera_outlined),
                    label: const Text('Change photo'),
                  ),
                ),
                TextField(
                  controller: _first,
                  decoration: const InputDecoration(labelText: 'First name'),
                ),
                TextField(
                  controller: _last,
                  decoration: const InputDecoration(labelText: 'Last name'),
                ),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                TextField(
                  controller: _city,
                  decoration: const InputDecoration(labelText: 'City'),
                ),
                TextField(
                  controller: _subCity,
                  decoration: const InputDecoration(labelText: 'Sub-city / woreda'),
                ),
                TextField(
                  controller: _bio,
                  minLines: 2,
                  maxLines: 4,
                  decoration: const InputDecoration(labelText: 'Bio'),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _saving ? null : _saveProfile,
                  child: _saving
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save profile'),
                ),
              ],
            ),
          ),
          SectionCard(
            title: 'App mode',
            subtitle: u.canAccessPropertyOwnerTools
                ? 'Switch between renter and property owner workspace'
                : 'Become a property owner to list properties',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!u.landlordEligible && u.role == 'RENTER')
                  FilledButton.tonal(
                    onPressed: _becomeOwner,
                    child: const Text('Become a property owner'),
                  ),
                if (u.canAccessPropertyOwnerTools) ...[
                  const SizedBox(height: 8),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'RENTER', label: Text('Renter')),
                      ButtonSegment(value: 'LANDLORD', label: Text('Owner')),
                    ],
                    selected: {u.activeAppMode == 'LANDLORD' ? 'LANDLORD' : 'RENTER'},
                    onSelectionChanged: (s) => _setAppMode(s.first),
                  ),
                ],
              ],
            ),
          ),
          if (!u.phoneVerified)
            SectionCard(
              title: 'Phone verification',
              child: FilledButton.tonal(
                onPressed: () => context.push('/otp?phone=${Uri.encodeComponent(u.phoneNumber)}'),
                child: const Text('Verify phone with OTP'),
              ),
            ),
          SectionCard(
            title: 'Change password',
            child: Column(
              children: [
                TextField(
                  controller: _oldPass,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Current password'),
                ),
                TextField(
                  controller: _newPass,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New password'),
                ),
                TextField(
                  controller: _newPass2,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Confirm new password'),
                ),
                const SizedBox(height: 8),
                FilledButton.tonal(
                  onPressed: _passBusy ? null : _changePassword,
                  child: const Text('Update password'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
