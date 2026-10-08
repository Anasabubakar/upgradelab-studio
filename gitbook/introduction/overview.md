# Overview

A static viewer for [UpgradeLab](https://github.com/Upgrade-Lab/upgradelab-runner) migration-rehearsal reports. It opens on a broken migration next to the corrected one, using **real reports the runner generated**, and shows invariants with their evidence, the executed-operations timeline, the state at any checkpoint, and which execution category produced each result.

It never executes contract code or user code. It only reads JSON, validates it with a precompiled validator and draws it with text nodes. Hosted demo: https://upgradelab-studio-anasamasama.vercel.app. Run it locally below.

Source: [upgradelab-studio on GitHub](https://github.com/Upgrade-Lab/upgradelab-studio). Releases: [GitHub releases](https://github.com/Upgrade-Lab/upgradelab-studio/releases).
