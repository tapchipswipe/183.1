#!/usr/bin/env bash
set -e
echo "Phase A: Activation"
./scripts/phase_a_activate.sh
./scripts/validate_phase_a.sh
