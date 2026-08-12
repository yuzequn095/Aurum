#!/bin/sh

set -eu

configuration_file="${SRCROOT}/App/capacitor.config.json"

if [ ! -f "${configuration_file}" ]; then
  echo "error: Capacitor runtime configuration is missing. Run 'pnpm mobile:sync:ios' with the intended mobile environment." >&2
  exit 1
fi

case "${CONFIGURATION}" in
  Debug)
    expected_mode="debug"
    ;;
  Release)
    expected_mode="release"
    ;;
  *)
    echo "error: Unsupported Xcode configuration '${CONFIGURATION}'. Define its Aurum mobile-mode mapping before building." >&2
    exit 1
    ;;
esac

actual_mode="$(/usr/bin/plutil -extract plugins.AurumBuildContract.mode raw -o - "${configuration_file}" 2>/dev/null || true)"

if [ "${actual_mode}" != "${expected_mode}" ]; then
  echo "error: Xcode ${CONFIGURATION} requires AURUM_MOBILE_MODE=${expected_mode}, but the synced Capacitor configuration is '${actual_mode:-missing}'. Reconfigure and run 'pnpm mobile:sync:ios'." >&2
  exit 1
fi

echo "Verified Aurum ${CONFIGURATION} mobile configuration (${expected_mode})."
touch "${SCRIPT_OUTPUT_FILE_0}"
