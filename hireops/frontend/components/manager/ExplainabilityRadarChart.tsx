"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { motion, Variants } from "framer-motion";

const widgetVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, filter: "blur(6px)" },
  show: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ease: [0.22, 1, 0.36, 1], duration: 0.8 } },
};

interface RadarData {
  subject: string;
  A: number;
  fullMark: number;
}

interface ExplainabilityRadarChartProps {
  data: RadarData[];
}

export function ExplainabilityRadarChart({ data }: ExplainabilityRadarChartProps) {
  return (
    <motion.div variants={widgetVariants} className="relative group p-10 rounded-[2.5rem] bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-2xl shadow-2xl min-h-[480px] flex flex-col overflow-hidden">
      <h3 className="text-2xl text-neutral-100 font-light mb-1 relative z-10 tracking-tight">Skills Topology</h3>
      <p className="text-neutral-500 text-[10px] font-bold tracking-[0.2em] uppercase mb-10 w-full text-left relative z-10">AI vs Required Baseline Vector</p>
      
      <div className="flex-1 flex items-center justify-center relative z-10 w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
            <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar 
              name="Candidate Topology" 
              dataKey="A" 
              stroke="#6366f1" 
              strokeWidth={3}
              fill="#6366f1" 
              fillOpacity={0.25} 
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Dark gradient fade for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 to-transparent pointer-events-none" />
    </motion.div>
  );
}
