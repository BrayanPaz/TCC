import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/homeStyles';

export default function Home() {
  // Estados de navegação visual
  const [activeChat, setActiveChat] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'translated' | 'original' | 'split'>('split');
  
  // Estados dos Modais
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isGlossaryModalOpen, setGlossaryModalOpen] = useState(false);

  return (
    <View style={styles.container}>
      {/* ============================== */}
      {/* 1. MENU LATERAL ESQUERDO       */}
      {/* ============================== */}
      <View style={styles.leftSidebar}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>TranslateApp</Text>
        </View>

        <ScrollView style={styles.chatList}>
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={() => setActiveChat(false)}
          >
            <Text style={styles.newChatText}>+ Iniciar Novo Chat</Text>
          </TouchableOpacity>

          {/* Exemplo de histórico gerado visualmente */}
          <TouchableOpacity style={styles.historyItem} onPress={() => setActiveChat(true)}>
            <Text style={styles.historyText}>Tradução de Arquivo.pdf</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footerLeft}>
          <TouchableOpacity 
            style={styles.userInfo} 
            onPress={() => setProfileModalOpen(true)}
          >
            <View style={styles.avatar} />
            <Text style={styles.username}>Usuário</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="log-out-outline" size={24} color="#A0A0A0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================== */}
      {/* 2. ÁREA CENTRAL (MAIN CONTENT) */}
      {/* ============================== */}
      <View style={styles.mainArea}>
        {!activeChat ? (
          // ESTADO A: NOVO CHAT
          <View style={styles.newChatArea}>
            <TouchableOpacity style={styles.uploadBox}>
              <Ionicons name="cloud-upload-outline" size={48} color="#A0A0A0" />
              <Text style={styles.uploadText}>Arraste arquivos PDF/DOCX aqui ou clique para importar</Text>
            </TouchableOpacity>
            <TextInput 
              style={styles.promptInput} 
              placeholder="Digite especificações de tradução..." 
              placeholderTextColor="#777"
            />
          </View>
        ) : (
          // ESTADO B: CHAT ATIVO
          <>
            <View style={styles.topNavActive}>
              <TouchableOpacity 
                style={[styles.tabButton, viewMode === 'translated' && styles.tabButtonActive]}
                onPress={() => setViewMode('translated')}
              >
                <Text style={styles.tabText}>Arquivo Traduzido</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.splitControl} onPress={() => setViewMode('split')}>
                <Ionicons name="book-outline" size={24} color={viewMode === 'split' ? '#BB86FC' : '#A0A0A0'} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.tabButton, viewMode === 'original' && styles.tabButtonActive]}
                onPress={() => setViewMode('original')}
              >
                <Text style={styles.tabText}>Arquivo Original</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.readingArea}>
              {(viewMode === 'split' || viewMode === 'translated') && (
                <ScrollView style={styles.documentContainer}>
                  <Text style={styles.documentText}>[Conteúdo do Arquivo Traduzido centralizado aqui...]</Text>
                </ScrollView>
              )}
              
              {viewMode === 'split' && <View style={styles.divider} />}

              {(viewMode === 'split' || viewMode === 'original') && (
                <ScrollView style={styles.documentContainer}>
                  <Text style={styles.documentText}>[Conteúdo do Arquivo Original centralizado aqui...]</Text>
                </ScrollView>
              )}
            </View>
          </>
        )}
      </View>

      {/* ============================== */}
      {/* 3. MENU LATERAL DIREITO        */}
      {/* ============================== */}
      {activeChat && (
        <View style={styles.rightSidebar}>
          <View style={styles.rightHeader}>
            <Text style={styles.rightHeaderTitle}>Assistente & Ajustes</Text>
          </View>
          
          <ScrollView style={styles.aiChatArea}>
            <Text style={{ color: '#A0A0A0', fontStyle: 'italic' }}>Interface de chat com IA...</Text>
          </ScrollView>

          <TouchableOpacity 
            style={styles.glossaryButton}
            onPress={() => setGlossaryModalOpen(true)}
          >
            <Text style={styles.glossaryButtonText}>Glossário</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ============================== */}
      {/* MODALS                         */}
      {/* ============================== */}
      
      {/* Modal de Edição de Perfil */}
      <Modal visible={isProfileModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TextInput style={styles.modalInput} placeholder="Nome de usuário" placeholderTextColor="#777" />
            <TextInput style={styles.modalInput} placeholder="URL da foto" placeholderTextColor="#777" />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setProfileModalOpen(false)}>
                <Text style={{ color: '#FFF' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={() => setProfileModalOpen(false)}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Glossário */}
      <Modal visible={isGlossaryModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gerenciar Glossário</Text>
            <TextInput style={styles.modalInput} placeholder="Termo Original" placeholderTextColor="#777" />
            <TextInput style={styles.modalInput} placeholder="Tradução Fixa" placeholderTextColor="#777" />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setGlossaryModalOpen(false)}>
                <Text style={{ color: '#FFF' }}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={() => setGlossaryModalOpen(false)}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}