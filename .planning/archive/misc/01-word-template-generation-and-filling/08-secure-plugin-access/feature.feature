Feature: Secure Plugin Access
  As a caller using the secure plugin
  I want to invoke allowlisted service operations
  So that I receive results without ever accessing raw secrets

  Scenario: Allowlisted operation returns sanitized result
    Given the allowlist contains fixture-secret.derive-digest
    And the keychain stores SECURE_PLUGIN_FIXTURE_SECRET
    When runSecureAction is called with service "fixture-secret", operation "derive-digest", and args { salt: "test-salt" }
    Then the result contains { ok: true, digest: "<sha256-hex>" }
    And the result does not contain the secret value

  Scenario: Unknown service is rejected before secret lookup
    Given the allowlist contains fixture-secret.derive-digest
    When runSecureAction is called with service "unknown-service", operation "any", and args {}
    Then the operation fails with a validation error
    And no keychain access occurs

  Scenario: Unknown operation for known service is rejected
    Given the allowlist contains fixture-secret.derive-digest
    When runSecureAction is called with service "fixture-secret", operation "unknown-op", and args {}
    Then the operation fails with a validation error
    And no keychain access occurs

  Scenario: Malformed input is rejected
    When runSecureAction is called with missing service or operation fields
    Then the operation fails with a validation error
    And no keychain access occurs

  Scenario: Raw get command is deprecated
    When env-registry get is invoked from CLI
    Then it exits with code 1
    And it prints a deprecation message directing to secure plugin workflow
    And it performs no keychain lookup