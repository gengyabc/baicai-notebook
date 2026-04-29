---
step-key: sensitive-command-approval
step-number: 06
step-folder: 06-sensitive-command-approval
phase-topic: word-template-generation-and-filling
status: discovered
requirement-version: 1
updated-at: 2026-04-26
source: discover-requirements
supersedes: null
---

## Restated Request

Define a reusable approval mechanism for sensitive commands so OpenCode can require explicit user consent before executing risky operations, provide a local fallback path when the user refuses LLM access, and support safe document filling workflows where the LLM never sees the sensitive values.

## Real Objective

Create a general policy layer for command approval that can be reused by multiple tools or scripts, while still supporting friendly user-facing prompts, fallback instructions, and non-LLM document filling workflows for sensitive actions.

## Problem Statement

The current `env-registry` discussion exposed a broader need: some command invocations should not run automatically when they may access or modify sensitive information. The approval behavior should be reusable, not hardcoded to one script, and should still give the user clear context before execution. When the user refuses LLM access, the system should still point to a local method the user can run directly, and document-filling flows should be able to inject sensitive values through local code without exposing them to the model.

## In Scope

- A reusable approval concept for sensitive command execution
- Clear separation between policy decision and user-facing explanation
- User-facing fallback guidance when approval is denied
- Safe local-script workflows for filling documents with sensitive values while keeping those values out of the model context
- Compatibility with OpenCode permission checks
- Optional plugin support for friendlier messaging or audit-style guidance
- Application to `env-registry` as one motivating example

## Out of Scope

- Implementing the approval mechanism itself
- Changing the `env-registry.py` CLI behavior
- Writing plugin or permission config code
- General-purpose workflow redesign beyond command approval

## Constraints

- Sensitive operations must still require explicit user consent before execution
- The mechanism should not be limited to a single command path or script name
- Approval should remain understandable to the user at the point of use
- The plan must not assume plugins can replace permission enforcement
- If approval is denied, the user must still be told how to complete the task locally
- Document filling may use local Python scripts to inject sensitive values, but the model must not receive those values

## Assumptions

- A command can be classified as sensitive based on its name, arguments, or pattern
- OpenCode permissions are the primary enforcement layer
- Plugins, if used, are supplementary to enforcement
- Local scripts can securely read sensitive values from trusted local storage or input without exposing them to the model

## Open Questions

- Which matching surface should define sensitivity first: command name, argument pattern, or both
- Whether the mechanism should distinguish read, write, and boundary-changing operations
- How much of the user-facing prompt should be standardized versus per-command
- Which fallback instructions should be standardized for denied requests versus left to each command-specific workflow

## Success Criteria

- A single approval model can be reused for multiple sensitive commands
- `env-registry` can be handled as one concrete instance of the model
- The user receives a clear approval prompt before sensitive execution
- The design cleanly separates reusable policy from command-specific messaging
- When access is denied, the user still gets a workable local path to finish the task
- Sensitive document filling can be completed by local code without the model seeing the sensitive values

## Suggested Planning Focus

First define the reusable sensitivity and approval model, including how commands are matched and how enforcement and messaging responsibilities are split.
