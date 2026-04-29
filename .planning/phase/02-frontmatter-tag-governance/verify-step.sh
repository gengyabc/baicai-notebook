#!/usr/bin/env bash
# Verification script for step 02-frontmatter-tag-governance
# Tests: content structure and cross-document consistency for all TDD batches

set -uo pipefail

PASS=0
FAIL=0

assert_contains() {
  local file="$1" needle="$2" label="$3"
  if grep -qi "$needle" "$file" 2>/dev/null; then
    echo "PASS: $label"
    PASS=$((PASS+1))
  else
    echo "FAIL: $label (expected pattern '$needle' in $file)"
    FAIL=$((FAIL+1))
  fi
}

assert_section() {
  local file="$1" heading="$2" label="$3"
  if grep -qiE "^#{1,3} *${heading}" "$file" 2>/dev/null; then
    echo "PASS: $label"
    PASS=$((PASS+1))
  else
    echo "FAIL: $label (expected heading '$heading' in $file)"
    FAIL=$((FAIL+1))
  fi
}

assert_not_contains() {
  local file="$1" needle="$2" label="$3"
  if grep -qi "$needle" "$file" 2>/dev/null; then
    echo "FAIL: $label (unexpected pattern '$needle' found in $file)"
    FAIL=$((FAIL+1))
  else
    echo "PASS: $label"
    PASS=$((PASS+1))
  fi
}

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

META_CONV="$REPO_ROOT/.opencode/rules/metadata-conventions.md"
FIELD_MATRIX="$REPO_ROOT/docs/metadata-field-matrix.md"
ALIAS_REG="$REPO_ROOT/docs/metadata-alias-registry.md"
LINT_WF="$REPO_ROOT/.opencode/workflows/lint-vault.md"
LINT_SKILL="$REPO_ROOT/.opencode/skills/second-brain-lint/SKILL.md"
QUERY_WF="$REPO_ROOT/.opencode/workflows/query-vault.md"
QUERY_SKILL="$REPO_ROOT/.opencode/skills/second-brain-query/SKILL.md"

echo "=== Batch 1: Structured Fields Versus Tags Policy ==="

assert_contains "$META_CONV" "structured field" "1.1: metadata-conventions states structured fields carry time/location"
assert_contains "$META_CONV" "retrieval aid" "1.2: metadata-conventions defines tags as retrieval aids"
assert_contains "$META_CONV" "topic/" "1.3: metadata-conventions preserves hierarchical topic/* tags"
assert_contains "$FIELD_MATRIX" "country" "1.4a: field-matrix references country field"
assert_contains "$FIELD_MATRIX" "province" "1.4b: field-matrix references province field"
assert_contains "$FIELD_MATRIX" "city" "1.4c: field-matrix references city field"
assert_contains "$FIELD_MATRIX" "canonical_topic" "1.4d: field-matrix references canonical_topic"
assert_not_contains "$META_CONV" "location.*primary retrieval" "1.5: metadata-conventions does not imply freeform location as primary retrieval shape"
# QR-02-P2-002: The positive example in "When tags are allowed" must use structured location fields (country/province/city), not freeform location
assert_contains "$META_CONV" "structured location fields" "1.6: metadata-conventions positive example uses structured location fields (QR-02-P2-002)"

echo ""
echo "=== Batch 2: Alias Registry And Canonicalization Rules ==="

assert_section "$ALIAS_REG" "Tag aliases" "2.1a: alias-registry has Tag aliases section"
assert_section "$ALIAS_REG" "Location aliases" "2.1b: alias-registry has Location aliases section"
assert_section "$ALIAS_REG" "Canonical topic aliases" "2.1c: alias-registry has Canonical topic aliases section"
assert_contains "$ALIAS_REG" "canonical" "2.2a: alias-registry defines canonical values"
assert_contains "$ALIAS_REG" "alias" "2.2b: alias-registry defines accepted aliases"
assert_contains "$ALIAS_REG" "rationale" "2.2c: alias-registry defines review rationale"
assert_contains "$ALIAS_REG" "human review" "2.3: alias-registry explains human review requirement"
assert_contains "$ALIAS_REG" "country" "2.4a: alias-registry keeps country distinct"
assert_contains "$ALIAS_REG" "province" "2.4b: alias-registry keeps province distinct"
assert_contains "$ALIAS_REG" "city" "2.4c: alias-registry keeps city distinct"
assert_contains "$ALIAS_REG" "canonical_topic" "2.5: alias-registry covers canonical_topic normalization"
assert_contains "$ALIAS_REG" "source/generated" "2.6a: alias-registry includes source/generated canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "role/synthesis" "2.6b: alias-registry includes role/synthesis canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "state/reviewed" "2.6c: alias-registry includes state/reviewed canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "state/draft" "2.6d: alias-registry includes state/draft canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "source/local" "2.6e: alias-registry includes source/local canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "source/chat" "2.6f: alias-registry includes source/chat canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "source/manual" "2.6g: alias-registry includes source/manual canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "role/topic" "2.6h: alias-registry includes role/topic canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "role/entity" "2.6i: alias-registry includes role/entity canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "role/draft" "2.6j: alias-registry includes role/draft canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "role/index" "2.6k: alias-registry includes role/index canonical tag (QR-02-P1-001)"
assert_contains "$ALIAS_REG" "role/log" "2.6l: alias-registry includes role/log canonical tag (QR-02-P1-001)"

echo ""
echo "=== Batch 3: Advisory Lint Consumption ==="

assert_contains "$LINT_WF" "alias drift" "3.1a: lint-vault checks alias drift"
assert_contains "$LINT_WF" "tag growth" "3.1b: lint-vault checks uncontrolled tag growth"
assert_contains "$LINT_SKILL" "governance" "3.2a: lint skill reflects governance findings"
assert_contains "$LINT_SKILL" "alias" "3.2b: lint skill references aliases"
assert_contains "$LINT_WF" "advisory" "3.3a: lint-vault distinguishes advisory from hard-blocking"
assert_contains "$LINT_SKILL" "advisory" "3.3b: lint skill distinguishes advisory from hard-blocking"
assert_contains "$LINT_WF" "imageNameKey" "3.4a: lint-vault retains imageNameKey check"
assert_contains "$LINT_WF" "frontmatter" "3.4b: lint-vault retains frontmatter coverage check"

echo ""
echo "=== Batch 4: Retrieval Consumer Alignment ==="

assert_contains "$QUERY_WF" "governance" "4.1a: query-vault references governance assumptions"
assert_contains "$QUERY_WF" "structured field" "4.1b: query-vault references structured fields policy"
assert_contains "$QUERY_SKILL" "structured field" "4.2a: query skill references structured fields"
assert_contains "$QUERY_SKILL" "governance" "4.2b: query skill references governance"
assert_contains "$QUERY_WF" "topic/" "4.3a: query-vault preserves hierarchical tag matching"
assert_contains "$QUERY_SKILL" "topic/" "4.3b: query skill preserves hierarchical tag matching"
assert_contains "$QUERY_WF" "China" "4.3c: query-vault preserves China default semantics"
assert_contains "$QUERY_SKILL" "China" "4.3d: query skill preserves China default semantics"
assert_not_contains "$QUERY_WF" "tags as primary" "4.4a: query-vault does not reintroduce tags as primary carrier"
assert_not_contains "$QUERY_SKILL" "tags as primary" "4.4b: query skill does not reintroduce tags as primary carrier"
assert_contains "$QUERY_WF" "future enhancement" "4.5a: query-vault clarifies alias expansion is a future enhancement (QR-02-P2-003)"
assert_contains "$QUERY_SKILL" "future enhancement" "4.5b: query skill clarifies alias expansion is a future enhancement (QR-02-P2-003)"
assert_contains "$QUERY_WF" "governance reference" "4.5c: query-vault describes alias registry as governance reference (QR-02-P2-003)"
assert_contains "$QUERY_SKILL" "governance reference" "4.5d: query skill describes alias registry as governance reference (QR-02-P2-003)"

echo ""
echo "=== Results ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
