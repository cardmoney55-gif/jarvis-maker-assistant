/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal, secure preload bridge. The JARVIS UI is a standard web app that
 * talks to the local backend over HTTP, so we only expose a tiny, read-only
 * marker that the renderer can use to detect it is running inside the desktop
 * shell (e.g. for "Desktop Edition" labelling).
 */

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
});
