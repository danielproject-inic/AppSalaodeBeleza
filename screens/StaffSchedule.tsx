import React, { useState } from 'react';
import { AvailabilityModal } from '../components/AvailabilityModal';

interface StaffScheduleProps {
    persistedExceptions?: Record<string, Record<string, 'off' | 'vacation' | 'sick'>>;
    onSaveAvailability: (staffId: string, exceptions: Record<string, 'off' | 'vacation' | 'sick'>) => void;
    collaborators?: any[];
}

const StaffSchedule: React.FC<StaffScheduleProps> = ({ persistedExceptions = {}, onSaveAvailability, collaborators = [] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined);

    // Derive staff members from collaborators (filter out terminated)
    const staffMembers = collaborators
        .filter(c => c.status !== 'Desligado')
        .map(c => ({
            id: c.id,
            name: c.nome,
            avatar: c.avatar || undefined
        }));

    const handleOpenModal = (staffId?: string) => {
        setSelectedStaffId(staffId);
        setIsModalOpen(true);
    };

    const handleSave = (data: { staffId: string; shifts: any[]; workingDays: string[]; exceptions: Record<string, 'off' | 'vacation' | 'sick'> }) => {
        onSaveAvailability(data.staffId, data.exceptions);
        setIsModalOpen(false);
    };

    return (
        <div className="flex h-full flex-col bg-[#e8e2d4]/40 overflow-hidden text-slate-800 dark:text-gray-100 font-sans selection:bg-slate-300/30">
            {/* BACKGROUND AMBIENCE */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0f172a]/5 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-500/5 blur-[120px] animate-pulse animate-delay-2s"></div>
            </div>

            {/* Header */}
            <header className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40 bg-transparent dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-slate-300 shadow-xl m-4 rounded-2xl">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800 bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 font-display">Horários e Disponibilidade</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie os horários de trabalho e exceções de cada colaborador.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="py-2.5 px-5 rounded-xl bg-cyan-500 text-white border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-slate-800 font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-white/20"
                >
                    <span className="material-symbols-outlined text-xl">edit_calendar</span>
                    Gerenciar Disponibilidade
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {staffMembers.map(staff => {
                        const exceptions = persistedExceptions[staff.id] || {};
                        const exceptionCount = Object.keys(exceptions).length;

                        // Count types
                        const vacationCount = Object.values(exceptions).filter(e => e === 'vacation').length;
                        const sickCount = Object.values(exceptions).filter(e => e === 'sick').length;
                        const offCount = Object.values(exceptions).filter(e => e === 'off').length;

                        return (
                            <div
                                key={staff.id}
                                onClick={() => handleOpenModal(staff.id)}
                                className="bg-white dark:bg-slate-900/60 backdrop-blur-sm p-5 rounded-2xl border border-slate-300 dark:border-gray-800 hover:border-cyan-500/40 hover:shadow-lg transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="size-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
                                        {staff.avatar ? (
                                            <img src={staff.avatar} alt={staff.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-black text-white/40">{staff.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-gray-100">{staff.name}</h3>
                                        <p className="text-xs text-slate-500">{exceptionCount} exceções definidas</p>
                                    </div>
                                </div>

                                {exceptionCount > 0 ? (
                                    <div className="flex gap-2 flex-wrap">
                                        {vacationCount > 0 && (
                                            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-lg font-bold">
                                                {vacationCount} Férias
                                            </span>
                                        )}
                                        {sickCount > 0 && (
                                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-lg font-bold">
                                                {sickCount} Atestado
                                            </span>
                                        )}
                                        {offCount > 0 && (
                                            <span className="text-xs bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-xl dark:bg-gray-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg font-bold">
                                                {offCount} Folgas
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Nenhuma exceção definida</p>
                                )}

                                <div className="mt-4 pt-4 border-t border-slate-300 dark:border-gray-800 flex items-center justify-between">
                                    <span className="text-xs text-slate-400 group-hover:text-cyan-500 transition-colors">Clique para editar</span>
                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-cyan-500 transition-colors">chevron_right</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {staffMembers.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <span className="material-symbols-outlined text-6xl text-slate-500 mb-4">group_off</span>
                        <h3 className="text-lg font-bold text-slate-500">Nenhum colaborador encontrado</h3>
                        <p className="text-sm text-slate-400 mt-1">Adicione colaboradores na tela de Equipe para gerenciar seus horários.</p>
                    </div>
                )}
            </main>

            {/* Availability Modal */}
            <AvailabilityModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                staffMembers={staffMembers}
                initialStaffId={selectedStaffId}
                persistedExceptions={persistedExceptions}
                onSave={handleSave}
            />
        </div>
    );
};

export default StaffSchedule;
