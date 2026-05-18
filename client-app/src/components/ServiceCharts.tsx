import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';

interface ChartData {
    label: string;
    value: number;
    color: string;
}

interface ServiceChartsProps {
    data: ChartData[];
    title: string;
}

const ServiceCharts: React.FC<ServiceChartsProps> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    if (data.length === 0) {
        return (
            <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-500/10 flex items-center justify-center mb-4">
                    <RefreshCcw className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</h2>
                <p className="text-[9px] font-bold text-slate-500 uppercase italic">Nenhum dado disponível nos últimos 6 meses</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 h-full">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">{title}</h2>
            
            <div className="flex items-end justify-between h-48 gap-4 px-2">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center group relative">
                        {/* Tooltip */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            whileHover={{ opacity: 1, y: 0 }}
                            className="absolute -top-10 bg-white text-[#07090f] px-2 py-1 rounded text-[10px] font-black pointer-events-none z-10"
                        >
                            {item.value}x
                        </motion.div>
 
                        {/* Bar */}
                        <div className="w-full relative flex flex-col items-center justify-end h-full">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(item.value / maxValue) * 100}%` }}
                                transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                                style={{ backgroundColor: item.color }}
                                className="w-full rounded-t-lg shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] relative overflow-hidden group-hover:brightness-125 transition-all"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                <motion.div 
                                    className="absolute inset-0 bg-white/20"
                                    animate={{ opacity: [0, 0.4, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                            </motion.div>
                        </div>

                        {/* Label */}
                        <p className="mt-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter text-center line-clamp-1">
                            {item.label}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Frequência</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                    <span className="text-[9px] font-bold text-slate-500 uppercase italic">Ultimos 6 meses</span>
                </div>
            </div>
        </div>
    );
};

export default ServiceCharts;
