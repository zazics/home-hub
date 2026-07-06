---
description: Add a new device and its controls to Home Hub, via the agent pipeline.
argument-hint: [device-name]
---

Add support for the device "$ARGUMENTS" to Home Hub.
Follow this pipeline, pausing for my validation between each step:

1.  Use the architect subagent to design the data model, the API contract and the control actions for this device. Write the spec under docs/adr/.
2.  Use the backend subagent to implement the API from that spec, with unit tests.
3.  Use the frontend subagent to add the control UI in the Angular dashboard.
    Report a summary and wait for my approval before each subagent runs.
