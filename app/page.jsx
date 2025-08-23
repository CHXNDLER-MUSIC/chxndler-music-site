"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/*
  CHXNDLER Cockpit - single file v1.4 (ASCII safe)
  - No template literals in JSX
  - No curly-comment blocks inside JSX
  - Simple inline styles using plain strings
*/

const COCKPIT_BUILD = "Cockpit v1.4 - page.jsx active";
if (typeof window !== "undefined") {
  console.log("[COCKPIT]", COCKPIT_BUILD);
  window.COCKPIT_BUILD = COCKPIT_BUILD;
  window.addEventListener("keydown", (e) => {
