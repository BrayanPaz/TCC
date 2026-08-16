// Estilos para a tela principal (Index.tsx) com efeitos smooth em todos os componentes

export const mainStyles = {
  container: "flex-1 flex-row bg-[#0c0c12] h-full overflow-hidden",
  mainContent: "flex-1 flex-col h-full bg-[#0c0c12] transition-all duration-300 ease-in-out",
  
  // Toggle Sidebars com transição suave e hover
  sideToggleBtnLeft: "w-5 h-12 bg-[#13131c] border border-white/[0.08] border-l-0 rounded-r-xl items-center justify-center cursor-pointer hover:bg-[#1c1c28] active:scale-95 transition-all duration-200 shadow-md",
  sideToggleBtnRight: "w-5 h-12 bg-[#13131c] border border-white/[0.08] border-r-0 rounded-l-xl items-center justify-center cursor-pointer hover:bg-[#1c1c28] active:scale-95 transition-all duration-200 shadow-md",
  
  // New Chat View
  newChatContainer: "flex-1 items-center justify-center px-8 py-6 max-w-xl mx-auto w-full animate-smooth-fade",
  welcomeTitle: "text-lg font-semibold text-[#e8e8f0] tracking-tight text-center mb-1",
  welcomeSubtitle: "text-xs text-[#6b6b80] text-center mb-6",
  
  dropzone: "w-full rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 items-center justify-center mb-4 hover:border-[#6b8cff]/40 hover:bg-white/[0.03] active:scale-[0.99] transition-all duration-200 cursor-pointer",
  dropzoneIconBox: "w-11 h-11 rounded-xl bg-white/[0.06] items-center justify-center mb-3 transition-transform duration-200",
  dropzoneText: "text-[#c8c8d8] font-medium text-xs text-center",
  dropzoneSubtext: "text-[#6b6b80] text-[10px] mt-0.5 text-center",
  
  sampleButtonsRow: "flex-row flex-wrap justify-center gap-2 mb-4 w-full",
  sampleBtn: "px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-95 transition-all duration-200",
  sampleBtnText: "text-[#a0a0b8] text-[11px]",

  // Language Selector Bar
  langBar: "w-full flex-row items-center justify-between bg-[#13131c] border border-white/[0.07] rounded-xl px-4 py-2.5 mb-3 transition-all duration-200 shadow-sm",
  langPickerBtn: "flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] active:scale-95 transition-all duration-200",
  langPickerText: "text-[#c8c8d8] text-xs font-medium",
  langArrow: "text-[#6b6b80] text-xs mx-1",

  // Prompt Box
  promptBox: "w-full rounded-2xl bg-[#13131c] border border-white/[0.07] overflow-hidden mb-4 shadow-sm hover:border-white/[0.12] transition-all duration-200",
  promptInput: "w-full px-4 pt-3.5 pb-2 text-xs text-[#e8e8f0] min-h-[90px] max-h-[160px]",
  promptFooter: "flex-row items-center justify-between px-4 py-2.5 border-t border-white/[0.05]",
  promptLabel: "text-[10px] uppercase tracking-widest text-[#6b6b80] font-medium",
  translateBtn: "flex-row items-center bg-[#6b8cff] px-4 py-1.5 rounded-lg hover:bg-[#5b7ce8] hover:shadow-lg hover:shadow-[#6b8cff]/20 active:scale-95 transition-all duration-200",
  translateBtnDisabled: "flex-row items-center bg-[#6b8cff]/40 px-4 py-1.5 rounded-lg",
  translateBtnText: "text-white font-medium text-xs ml-1.5",

  // Reading View
  tabHeaderContainer: "flex-row justify-center pt-4 pb-3 flex-shrink-0 animate-smooth-fade",
  floatingTabBar: "flex-row items-center bg-[#13131c] border border-white/[0.08] rounded-full p-1 shadow-lg shadow-black/50 transition-all duration-300",
  pillTab: "px-4 py-1.5 rounded-full hover:text-[#c8c8d8] active:scale-95 transition-all duration-200",
  pillTabActive: "px-4 py-1.5 rounded-full bg-[#6b8cff] shadow-md shadow-[#6b8cff]/20 transition-all duration-200",
  pillTabText: "text-[#6b6b80] text-xs font-medium",
  pillTabTextActive: "text-white text-xs font-medium",
  pillTabIconBtn: "px-3 py-1.5 rounded-full hover:bg-white/[0.05] active:scale-95 transition-all duration-200",

  readerContainer: "flex-1 flex-row gap-3 px-4 pb-4 overflow-hidden min-h-0",
  docPanel: "flex-1 rounded-xl bg-[#13131c] border border-white/[0.07] overflow-hidden p-5 flex flex-col h-full min-w-0 transition-all duration-300 ease-in-out animate-smooth-fade",
  
  // Modal (Glossário)
  modalOverlay: "absolute inset-0 bg-black/65 flex items-center justify-center p-4 z-50 animate-smooth-fade",
  modalCard: "w-full max-w-lg bg-[#13131c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-smooth-pop",
  modalHeader: "flex-row items-center justify-between px-6 py-4 border-b border-white/[0.07]",
  modalTitle: "text-[#e8e8f0] font-semibold text-sm",
  modalCloseBtn: "p-1 rounded text-[#6b6b80] hover:text-white transition-colors",
  
  modalBody: "px-6 py-4 max-h-96",
  glossaryTableHead: "flex-row justify-between pb-2 mb-2 border-b border-white/[0.07]",
  glossaryHeadText: "text-[10px] uppercase tracking-widest text-[#6b6b80] font-medium",
  glossaryRow: "flex-row items-center justify-between py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors",
  glossaryOriginalText: "text-xs text-[#c8c8d8] font-mono flex-1",
  glossaryTranslatedText: "text-xs text-white/70 flex-1 ml-2",
  glossaryDeleteBtn: "px-2 py-1 rounded text-red-400 text-xs hover:bg-red-500/10 active:scale-95 transition-all",

  glossaryAddRow: "flex-row gap-2 mt-4 pt-3 border-t border-white/[0.07]",
  glossaryInput: "flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:border-[#6b8cff]/50 transition-colors",
  glossarySaveBtn: "bg-[#6b8cff] px-4 py-2 rounded-lg items-center justify-center hover:bg-[#5b7ce8] active:scale-95 transition-all",
  glossarySaveBtnText: "text-white font-medium text-xs",

  // Language Picker Modal
  langModalCard: "w-full max-w-sm bg-[#13131c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-5 animate-smooth-pop",
  langOption: "flex-row items-center justify-between p-3 rounded-lg mb-1 hover:bg-white/[0.06] active:scale-[0.98] transition-all duration-150",
  langOptionText: "text-[#e8e8f0] text-xs font-medium",
  langOptionActiveText: "text-[#6b8cff] text-xs font-semibold",
};
