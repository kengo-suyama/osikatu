# Deliverables

This directory contains verification commands and rollback plans for Pull Requests.

## Directory Structure

- `pr-{number}-verification.md` - Verification commands and rollback plan for specific PRs

## Available Deliverables

- [PR #30 - Log Screen Race Condition Fix + E2E Hardening](./pr-30-verification.md)

## Purpose

Each deliverable document provides:
1. **Verification Commands** - Step-by-step commands to validate the PR changes
2. **Rollback Plan** - Detailed procedures to revert changes if issues are discovered
3. **Risk Assessment** - Analysis of potential impact
4. **Scope** - Clear documentation of what's changed and what's not affected

## Usage

Before merging a PR, reviewers should:
1. Follow the verification commands to test the changes
2. Review the rollback plan to ensure safe deployment
3. Check the risk assessment and scope documentation

After merging, if issues are discovered:
1. Refer to the rollback plan for the specific PR
2. Follow the appropriate rollback procedure based on the situation
