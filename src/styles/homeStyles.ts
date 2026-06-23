import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // Tema Global (Dark Mode)
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#121212',
  },
  
  // Menu Lateral Esquerdo
  leftSidebar: {
    width: 260,
    backgroundColor: '#1E1E1E',
    borderRightWidth: 1,
    borderRightColor: '#2C2C2C',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  headerLeft: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatList: {
    flex: 1,
    padding: 10,
  },
  newChatButton: {
    backgroundColor: '#333333',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  newChatText: {
    color: '#BB86FC',
    fontWeight: '600',
  },
  historyItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  historyText: {
    color: '#A0A0A0',
  },
  footerLeft: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#444444',
    marginRight: 10,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // Área Central (Main Content)
  mainArea: {
    flex: 1,
    backgroundColor: '#121212',
    flexDirection: 'column',
  },
  
  // Estado A: Novo Chat
  newChatArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  uploadBox: {
    width: '80%',
    height: 200,
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadText: {
    color: '#A0A0A0',
    marginTop: 10,
  },
  promptInput: {
    width: '80%',
    backgroundColor: '#1E1E1E',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    minHeight: 50,
  },

  // Estado B: Chat Ativo (Leitura)
  topNavActive: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#333333',
  },
  tabButtonActive: {
    backgroundColor: '#BB86FC',
  },
  tabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  splitControl: {
    paddingHorizontal: 15,
  },
  readingArea: {
    flex: 1,
    flexDirection: 'row',
  },
  documentContainer: {
    flex: 1,
    padding: 30,
  },
  documentText: {
    color: '#E0E0E0',
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    width: 2,
    backgroundColor: '#2C2C2C',
  },

  // Menu Lateral Direito (Glossário e IA)
  rightSidebar: {
    width: 280,
    backgroundColor: '#1E1E1E',
    borderLeftWidth: 1,
    borderLeftColor: '#2C2C2C',
    flexDirection: 'column',
  },
  rightHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  rightHeaderTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  aiChatArea: {
    flex: 1,
    padding: 15,
  },
  glossaryButton: {
    backgroundColor: '#03DAC6',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  glossaryButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },

  // Modals (Perfil e Glossário)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 400,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#121212',
    color: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtnCancel: {
    padding: 15,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 8,
  },
  modalBtnConfirm: {
    padding: 15,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
    backgroundColor: '#BB86FC',
    borderRadius: 8,
  },
});