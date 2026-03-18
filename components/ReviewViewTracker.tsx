"use client";

import { useEffect } from "react";

import { recordReviewView } from "@/lib/reviews";

type ReviewViewTrackerProps = {
  reviewId: string;
};

export function ReviewViewTracker({ reviewId }: ReviewViewTrackerProps) {
  useEffect(() => {
    void recordReviewView(reviewId).catch(() => {
      return;
    });
  }, [reviewId]);

  return null;
}
