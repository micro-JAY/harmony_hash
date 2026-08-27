## 1. Agent request contract

- [x] 1.1 Add optional validated existing-timeline input to the client and Worker progression request contract.
- [x] 1.2 Contextualize edit requests in the OpenAI loop and enforce the existing timeline's supported chord count in the validated response.
- [x] 1.3 Add Worker and client tests for valid edit context, invalid edit context, and no-context generation.

## 2. Progression Builder controls

- [x] 2.1 Pass the committed timeline into ProgressionAgent and add distinct Modify and Re-run actions.
- [x] 2.2 Style Modify with academy-blue status tokens while preserving Re-run's accent style, loading behavior, and responsive reflow.
- [x] 2.3 Add component-level coverage for request selection, disabled modify behavior, and accessible labels.
- [x] 2.4 Label the no-context action Run before chord cards exist and Re-run once a timeline exists, including accessible and keyboard-hint copy.

## 3. Validation

- [x] 3.1 Run targeted tests, lint, and production build; resolve all change-introduced failures.
- [x] 3.2 Verify the OpenSpec change and mark completed tasks.
