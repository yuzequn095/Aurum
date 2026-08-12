import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { mobileShellRoot } from './mobile-env.mjs';

test('Capacitor config keeps the durable identity, navigation, and outage boundaries', async () => {
  const configSource = await readFile(path.join(mobileShellRoot, 'capacitor.config.ts'), 'utf8');
  const contractSource = await readFile(path.join(mobileShellRoot, 'native-contract.ts'), 'utf8');

  assert.match(contractSource, /bundleIdentifier: 'io\.github\.yuzequn095\.aurum'/u);
  assert.match(contractSource, /displayName: 'Aurum'/u);
  assert.match(contractSource, /bridgeVersion: 1/u);
  assert.match(contractSource, /capabilities: \[\]/u);
  assert.match(configSource, /appId: AURUM_NATIVE_IDENTITY\.bundleIdentifier/u);
  assert.match(configSource, /appName: AURUM_NATIVE_IDENTITY\.displayName/u);
  assert.match(configSource, /webDir: 'dist'/u);
  assert.match(configSource, /errorPath: 'error\.html'/u);
  assert.match(configSource, /cleartext: false/u);
  assert.match(configSource, /contentInset: 'never'/u);
  assert.match(configSource, /AurumBuildContract/u);
  assert.doesNotMatch(configSource, /allowNavigation/u);
});

test('mobile shell defines no custom native bridge or financial storage', async () => {
  const packageSource = await readFile(path.join(mobileShellRoot, 'package.json'), 'utf8');

  assert.doesNotMatch(packageSource, /keychain|preferences|secure-storage|community\/http/iu);
});

test('committed iOS project keeps the 17C identity and least-privilege presentation policy', async () => {
  const iosRoot = path.join(mobileShellRoot, 'ios', 'App');
  const [projectSource, infoPlist, launchStoryboard, buildGuard] = await Promise.all([
    readFile(path.join(iosRoot, 'App.xcodeproj', 'project.pbxproj'), 'utf8'),
    readFile(path.join(iosRoot, 'App', 'Info.plist'), 'utf8'),
    readFile(path.join(iosRoot, 'App', 'Base.lproj', 'LaunchScreen.storyboard'), 'utf8'),
    readFile(path.join(iosRoot, 'verify-mobile-configuration.sh'), 'utf8'),
  ]);

  assert.match(projectSource, /PRODUCT_BUNDLE_IDENTIFIER = io\.github\.yuzequn095\.aurum;/u);
  assert.match(projectSource, /IPHONEOS_DEPLOYMENT_TARGET = 14\.0;/u);
  assert.match(projectSource, /TARGETED_DEVICE_FAMILY = 1;/u);
  assert.match(projectSource, /Verify Aurum Mobile Configuration/u);
  assert.doesNotMatch(
    projectSource,
    /DEVELOPMENT_TEAM|PROVISIONING_PROFILE|CODE_SIGN_ENTITLEMENTS/u,
  );

  assert.match(infoPlist, /<key>CFBundleDisplayName<\/key>\s*<string>Aurum<\/string>/u);
  assert.match(infoPlist, /<string>UIInterfaceOrientationPortrait<\/string>/u);
  assert.doesNotMatch(infoPlist, /Landscape|NS[A-Z][A-Za-z]+UsageDescription/u);
  assert.match(infoPlist, /<string>UIStatusBarStyleDarkContent<\/string>/u);
  assert.match(launchStoryboard, /image="AurumLaunchMark"/u);
  assert.doesNotMatch(launchStoryboard, /image="Splash"/u);
  assert.match(buildGuard, /Release\)\s*expected_mode="release"/u);
  assert.match(buildGuard, /Debug\)\s*expected_mode="debug"/u);
});
