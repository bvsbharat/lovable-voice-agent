import React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedGroupProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  initial?: string;
  animate?: string;
  exit?: string;
}

export const AnimatedGroup: React.FC<AnimatedGroupProps> = ({
  children,
  className,
  variants,
  initial = 'hidden',
  animate = 'visible',
  exit = 'hidden',
  ...props
}) => {
  return (
    <motion.div
      className={cn(className)}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedGroup;