import mongoose from "mongoose";

/*
 * UrlModel.js — Sniply data models
 *
 * Slug namespace note:
 *   shortCode and customAlias share the same public URL namespace (/[slug]).
 *   Both fields carry unique: true indexes. Collision checks must query BOTH
 *   fields with $or when accepting user input or generating new codes.
 *
 * Click consistency model:
 *   The Click collection is the authoritative source of truth for analytics.
 *   Url.clicks is a denormalized counter used only for the dashboard quick-view.
 *   Writes are attempted together in after() — if the counter update fails,
 *   the Click document still exists and can be reconciled later.
 *   The analytics API counts clicks via Click.countDocuments(), not Url.clicks.
 */

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type:     String,
      required: [true, "Original URL is required"],
      trim:     true,
    },
    shortCode: {
      type:     String,
      required: [true, "Short code is required"],
      unique:   true,
      trim:     true,
    },
    customAlias: {
      type:   String,
      unique: true,
      sparse: true, // allows multiple null values while enforcing uniqueness on non-null
      trim:   true,
    },
    userId: {
      type:    String,
      default: null,
    },
    clicks: {
      type:    Number,
      default: 0,
    },
    expiresAt: {
      type:    Date,
      default: null,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

urlSchema.virtual("shortUrl").get(function () {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/${this.customAlias || this.shortCode}`;
});

urlSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

/*
 * Indexes:
 *   - shortCode: unique index defined on field (above) — supports public slug lookup
 *   - customAlias: unique sparse index defined on field (above) — supports alias lookup
 *   - userId + createdAt: compound index — supports dashboard list queries (user's links sorted by date)
 *
 * Note: Do NOT add a redundant index({ shortCode: 1 }) or index({ customAlias: 1 }) here —
 *       the schema-level `unique: true` already creates those indexes.
 */
urlSchema.index({ userId: 1, createdAt: -1 });

/* ── Click schema ──────────────────────────────────────────── */

const clickSchema = new mongoose.Schema(
  {
    urlId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Url",
      required: true,
    },
    shortCode: {
      type:     String,
      required: true,
    },
    ipAddress: {
      type:    String,
      default: null,
    },
    userAgent: {
      type:    String,
      default: null,
    },
    browser: {
      type:    String,
      default: "Unknown",
    },
    os: {
      type:    String,
      default: "Unknown",
    },
    device: {
      type:    String,
      enum:    ["Desktop", "Mobile", "Tablet", "Unknown"],
      default: "Unknown",
    },
    country: {
      type:    String,
      default: null,
    },
    region: {
      type:    String,
      default: null,
    },
    referrer: {
      type:    String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Click indexes:
 *   - urlId + createdAt: supports timeline aggregations and recent-click queries
 *   - shortCode + createdAt: supports lookups by code if urlId is not available
 *
 * Note: urlId is indexed implicitly below, not via schema field index:true,
 *       to avoid creating a duplicate standalone index alongside the compound one.
 */
clickSchema.index({ urlId: 1, createdAt: -1 });
clickSchema.index({ shortCode: 1, createdAt: -1 });

/* ── UserSettings schema ──────────────────────────────────── */

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type:     String,
      required: true,
      unique:   true,
    },
    email: {
      type:    String,
      default: null,
    },
    displayName: {
      type:    String,
      default: null,
      trim:    true,
    },
    defaultExpiryDays: {
      type:    Number,
      default: 0,
      min:     0,
    },
    analyticsEnabled: {
      type:    Boolean,
      default: true,
    },
    totalLinks: {
      type:    Number,
      default: 0,
    },
    totalClicks: {
      type:    Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Url =
  mongoose.models.Url || mongoose.model("Url", urlSchema);

export const Click =
  mongoose.models.Click || mongoose.model("Click", clickSchema);

export const UserSettings =
  mongoose.models.UserSettings ||
  mongoose.model("UserSettings", userSettingsSchema);