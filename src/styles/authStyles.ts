// Estilos para as telas de Login e Cadastro (Centralizadas e Responsivas para PC e Mobile)

export const authStyles = {
  container: "flex-1 bg-[#0e0e11] justify-center items-center px-4 py-8",
  
  card: "w-full max-w-md bg-[#16161d] border border-[#262633] rounded-3xl p-8 shadow-2xl",
  
  headerContainer: "mb-8 items-center",
  headerTitle: "text-white text-3xl font-bold mb-2 text-center",
  headerSubtitle: "text-[#8e8ea6] text-sm text-center",
  
  formContainer: "space-y-4 mb-6",
  inputGroup: "mt-4",
  inputLabel: "text-gray-300 font-medium text-xs mb-1.5",
  inputField: "bg-[#1e1e28] text-white p-3.5 rounded-xl border border-[#2d2d3e] text-sm",
  
  primaryButton: "bg-blue-600 p-3.5 rounded-xl items-center mb-5 active:bg-blue-700",
  disabledButton: "bg-[#262633] p-3.5 rounded-xl items-center mb-5",
  primaryButtonText: "text-white font-bold text-sm",
  disabledButtonText: "text-[#66667d] font-bold text-sm",
  
  footerContainer: "flex-row justify-center items-center mt-2",
  footerText: "text-[#7c7c94] text-xs",
  footerLink: "text-blue-400 font-semibold text-xs ml-1",

  // Específico para o SignUp
  checkboxContainer: "flex-row items-center my-4",
  checkboxBox: "w-5 h-5 border rounded-md mr-2.5 items-center justify-center",
  checkboxChecked: "border-blue-500 bg-blue-600",
  checkboxUnchecked: "border-[#404054] bg-[#1a1a24]",
  checkboxCheckmark: "text-white font-bold text-xs",
  termsContainer: "flex-1 flex-row flex-wrap items-center"
};
