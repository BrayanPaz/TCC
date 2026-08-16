// Estilos fiéis ao Figma (Translatio Design System) com transições suaves e design refinado

export const menuStyles = {
  // LMenu (Histórico, Perfil e Glossário)
  leftContainer: "w-64 bg-[#13131c] border-r border-white/[0.07] flex-col justify-between h-full p-0 transition-all duration-300 ease-in-out",
  logoSection: "px-5 py-4 flex-row items-center border-b border-white/[0.07]",
  logoIconBox: "w-6 h-6 rounded-md bg-[#6b8cff]/20 items-center justify-center mr-2.5",
  logoText: "text-[#e8e8f0] font-semibold text-sm tracking-tight",
  
  historyHeader: "px-4 pt-3 pb-2",
  newTranslationBtn: "flex-row items-center justify-center bg-[#6b8cff]/15 active:bg-[#6b8cff]/25 p-2.5 rounded-lg mb-3 border border-[#6b8cff]/20 transition-colors duration-200",
  newTranslationBtnText: "text-[#6b8cff] font-medium text-xs ml-2",
  
  historyTitle: "text-[9px] font-medium text-[#6b6b80] uppercase tracking-[0.12em] px-2 mb-2",
  historyList: "flex-1 px-3 py-1",
  historyItem: "p-2.5 rounded-lg mb-1 active:bg-white/[0.05] transition-colors duration-150",
  historyItemActive: "p-2.5 rounded-lg mb-1 bg-white/[0.07] border border-white/[0.1]",
  historyItemTitle: "text-[#c8c8d8] text-xs font-normal",
  historyItemDate: "text-[#6b6b80] text-[10px] mt-0.5",
  
  footerMenu: "px-3 py-3 border-t border-white/[0.07] flex-row items-center justify-between",
  profileBtn: "flex-row items-center flex-1 mr-2 p-1.5 rounded-lg active:bg-white/[0.05] transition-colors",
  profileAvatar: "w-7 h-7 rounded-full bg-[#6b8cff]/20 items-center justify-center mr-2",
  profileName: "text-[#c8c8d8] text-xs font-medium truncate flex-1",
  logoutBtn: "p-2 rounded-lg active:bg-red-500/15 transition-colors",

  // RMenu (Copiloto Agêntico de Tradução)
  rightContainer: "w-80 bg-[#13131c] border-l border-white/[0.07] flex-col justify-between h-full p-0 transition-all duration-300 ease-in-out",
  copilotHeader: "px-4 py-3.5 border-b border-white/[0.07] flex-row items-center justify-between",
  glossaryTopBtn: "flex-row items-center justify-center bg-[#6b8cff]/15 active:bg-[#6b8cff]/25 p-2.5 rounded-xl border border-[#6b8cff]/20 w-full transition-colors",
  glossaryTopBtnText: "text-[#6b8cff] font-medium text-xs ml-2",
  
  chatList: "flex-1 px-4 py-4",
  userBubble: "bg-[#6b8cff] p-3 rounded-2xl rounded-br-sm max-w-[86%] self-end mb-3",
  userBubbleText: "text-white text-xs leading-relaxed",
  aiBubble: "bg-white/[0.06] p-3 rounded-2xl rounded-bl-sm max-w-[88%] self-start mb-3 border border-white/[0.04]",
  aiBubbleText: "text-[#c8c8d8] text-xs leading-relaxed",

  chatInputContainer: "p-3 border-t border-white/[0.07]",
  chatInputBox: "flex-row items-end bg-white/[0.05] rounded-xl px-3.5 py-2.5 border border-white/[0.06]",
  chatInput: "flex-1 text-[#e8e8f0] text-xs leading-relaxed max-h-24 py-1",
  sendBtn: "w-7 h-7 rounded-lg bg-[#6b8cff] items-center justify-center ml-2 transition-opacity",
};
