import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../../utils/api';

export default function IdeasListScreen({ navigation }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const response = await api.getIdeas();
      setIdeas(response.data);
    } catch (error) {
      console.error('Error loading ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (ideaId) => {
    try {
      if (liked[ideaId]) {
        await api.unlikeIdea(ideaId);
        setLiked({ ...liked, [ideaId]: false });
      } else {
        await api.likeIdea(ideaId);
        setLiked({ ...liked, [ideaId]: true });
      }
    } catch (error) {
      console.error('Error liking idea:', error);
    }
  };

  const renderIdea = ({ item }) => (
    <TouchableOpacity
      style={styles.ideaCard}
      onPress={() => navigation.navigate('IdeaDetail', { ideaId: item.idea_id })}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.stage}>{item.stage}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Views</Text>
          <Text style={styles.metaValue}>{item.view_count}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Likes</Text>
          <Text style={styles.metaValue}>{item.like_count}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Pitches</Text>
          <Text style={styles.metaValue}>{item.pitch_request_count}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, liked[item.idea_id] && styles.actionButtonActive]}
          onPress={() => handleLike(item.idea_id)}
        >
          <Text style={[styles.actionButtonText, liked[item.idea_id] && styles.actionButtonTextActive]}>
            {liked[item.idea_id] ? '❤️' : '🤍'} Like
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>⭐ Favorite</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📝 Pitch</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={ideas}
        renderItem={renderIdea}
        keyExtractor={(item) => item.idea_id}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  ideaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8
  },
  stage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12
  },
  metaItem: {
    alignItems: 'center'
  },
  metaLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  actions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center'
  },
  actionButtonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8'
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280'
  },
  actionButtonTextActive: {
    color: '#fff'
  }
});
