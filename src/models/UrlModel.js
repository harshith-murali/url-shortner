import mongoose from "mongoose";

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, "Original URL is required"],
      trim: true,
    },
    shortCode: {
      type: String,
      required: [true, "Short code is required"],
      unique: true,
      trim: true,
    },
    customAlias: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

urlSchema.virtual("shortUrl").get(function () {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${base}/${this.customAlias || this.shortCode}`;
});

urlSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

urlSchema.index({ shortCode: 1 });
urlSchema.index({ customAlias: 1 });
urlSchema.index({ userId: 1, createdAt: -1 });

const clickSchema = new mongoose.Schema(
  {
    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Url",
      required: true,
      index: true,
    },
    shortCode: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },
    device: {
      type: String,
      enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
      default: "Unknown",
    },
    country: {
      type: String,
      default: null,
    },
    region: {
      type: String,
      default: null,
    },
    referrer: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

clickSchema.index({ urlId: 1, createdAt: -1 });
clickSchema.index({ shortCode: 1, createdAt: -1 });

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      default: null,
    },
    displayName: {
      type: String,
      default: null,
      trim: true,
    },
    defaultExpiryDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    analyticsEnabled: {
      type: Boolean,
      default: true,
    },
    totalLinks: {
      type: Number,
      default: 0,
    },
    totalClicks: {
      type: Number,
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