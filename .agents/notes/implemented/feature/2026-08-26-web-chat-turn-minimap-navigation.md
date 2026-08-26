# Agent Note: Web chat turn minimap navigation

Status: implemented

English | [中文](2026-08-26-web-chat-turn-minimap-navigation.zh.md)

## Problem

Long conversation transcripts in the web client make it difficult for users to visually track conversation progression, understand turn hierarchy, and quickly jump to specific user prompts and assistant replies without endless manual scrolling.

## Decision

Add a vertical turn minimap (`TurnTimelineNav`) on the left side of the conversation scrollport.

Each turn in the conversation timeline is projected as a subtle horizontal dash indicator (`-`). Hovering over any dash displays a compact preview tooltip card showing the user prompt and assistant response excerpt. Clicking a dash smoothly scrolls the chat directly to that turn with a computed top offset. The active turn currently in the viewport is automatically tracked and highlighted using a throttled scroll listener. The container layout maintains `min-height: 100%` so the minimap remains stably anchored at the vertical center of the screen from the very first message.

## Alternatives considered

**Embedding mini-map inside the sidebar.** The sidebar manages workspace sessions, not within-session turn navigation; mixing session management and intra-session turn navigation clutters the sidebar.

**Floating modal outline.** A modal requires explicit open/close gestures and obscures conversation content, whereas a left-aligned subtle tick track provides persistent ambient orientation without interference.

## Consequences

Users can quickly scan, preview, and navigate across multiple conversational turns with persistent visual orientation and zero layout disruption.
