import React from "react";
import Card from "./ui/Card";

/**
 * Loading placeholders.
 *
 * The geometry here has to match the migrated pages these stand in for, so the
 * shells compose the same `Card` primitive and the spacing uses the same
 * `space-*` rhythm.
 *
 * `radius` is a prop rather than a caller-supplied `rounded-*` class on
 * purpose. `Skeleton` needs a default radius, and Tailwind gives two
 * `rounded-*` utilities on one element equal specificity — so a caller
 * writing `rounded-c57-xl` to override the built-in `rounded-c57-md` gets
 * whichever the generated stylesheet happens to list last, not the override.
 * A prop has no such ambiguity.
 */
export const Skeleton = ({ className = "", radius = "md", ...rest }) => (
  <div
    className={`animate-pulse bg-c57-surface-container-high rounded-c57-${radius} ${className}`}
    {...rest}
  />
);

export const CardSkeleton = () => (
  <Card className="p-space-lg overflow-hidden">
    <Skeleton className="w-full aspect-video" radius="xl" />
    <div className="space-y-space-md">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-6 w-1/4" />
      </div>
      <div className="space-y-space-sm">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="flex gap-space-sm pt-space-sm">
        <Skeleton className="h-10 flex-1" radius="lg" />
        <Skeleton className="h-10 w-12" radius="lg" />
      </div>
    </div>
  </Card>
);

export const OrderSkeleton = () => (
  <Card className="p-space-xl mb-gutter">
    <div className="flex justify-between items-start mb-space-xl">
      <div className="flex gap-space-md">
        <Skeleton className="w-16 h-16" radius="lg" />
        <div className="space-y-space-sm pt-space-sm">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-24" radius="xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-space-xl">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20" radius="lg" />
      ))}
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-32" radius="lg" />
      <Skeleton className="h-12 w-48" radius="lg" />
    </div>
  </Card>
);

export const PackageSkeleton = () => (
  <Card radius="lg" className="overflow-hidden">
    <Skeleton className="w-full aspect-[4/3]" radius="xl" />
    <div className="p-space-xl space-y-space-md">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex justify-between items-center pt-space-sm">
        <Skeleton className="h-10 w-1/3" radius="lg" />
        <Skeleton className="h-12 w-1/2" radius="lg" />
      </div>
    </div>
  </Card>
);

export const PageHeaderSkeleton = () => (
  <div className="mb-space-xl">
    <Skeleton className="h-4 w-32 mb-space-md" />
    <Skeleton className="h-12 w-96 mb-space-sm" />
    <Skeleton className="h-6 w-2/3" />
  </div>
);

const SkeletonLoader = {
  Skeleton,
  CardSkeleton,
  OrderSkeleton,
  PackageSkeleton,
  PageHeaderSkeleton
};

export default SkeletonLoader;
