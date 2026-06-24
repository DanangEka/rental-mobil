import React from "react";

export const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 rounded-md ${className}`} />
);

export const CardSkeleton = () => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 overflow-hidden">
    <Skeleton className="w-full aspect-video rounded-[2rem] mb-6" />
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-6 w-1/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-12 rounded-xl" />
      </div>
    </div>
  </div>
);

export const OrderSkeleton = () => (
  <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 mb-6">
    <div className="flex justify-between items-start mb-8">
      <div className="flex gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-12 w-48 rounded-xl" />
    </div>
  </div>
);

export const PackageSkeleton = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
    <Skeleton className="w-full aspect-[4/3]" />
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex justify-between items-center pt-6">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <Skeleton className="h-12 w-1/2 rounded-2xl" />
      </div>
    </div>
  </div>
);

export const PageHeaderSkeleton = () => (
  <div className="mb-12">
    <Skeleton className="h-4 w-32 mb-4" />
    <Skeleton className="h-12 w-96 mb-2" />
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
