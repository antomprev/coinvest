import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../../utils/api';

export default function IdeaDetailScreen({ route, navigation }) {
  const { ideaId } = route.params;
  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    loadIdea();
  }, []);

  const loadIdea = async () => {
    setLoading(true);
    try {
      const data = await api.getIdeaById(ideaId);
      setIdea(data);
    } catch (error) {
      console.error('Error loading idea:', error);
      Alert.alert('Error', 'Failed to load idea details');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      if (liked) {
        await api.unlikeIdea(ideaId);
        setLiked(false);
      } else {
        await api.likeIdea(ideaId);
        setLiked(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to like idea');
    }
  };

  const handleFavorite = async () => {
    try {
      if (favorite) {
        await api.removeFromFavorites(ideaId);
        setFavorite(false);
      } else {
        await api.addToFavorites(ideaId);
        setFavorite(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save favorite');
    }
  };

  const handleRequestPitch = async () => {
    try {
      await api.requestPitch(ideaId);
      Alert.alert('Success', 'Pitch request sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to request pitch');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  if (!idea) {
    return (
      <View style={styles.centerContainer}>
        <Text>Idea not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{idea.title}</Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{idea.stage}</Text>
          </View>
          <View style={[styles.badge, styles.badgeSecondary]}>
            <Text style={[styles.badgeText, styles.badgeTextSecondary]}>
              €{idea.funding_requested?.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{idea.description}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Target Audience</Text>
          <Text style={styles.detailValue}>{idea.target_audience}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Funding Requested</Text>
          <Text style={styles.detailValue}>€{idea.funding_requested?.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Engagement</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{idea.view_count}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{idea.like_count}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{idea.pitch_request_count}</Text>
            <Text style={styles.statLabel}>Pitch Requests</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, liked && styles.actionBtnPrimary]}
          onPress={handleLike}
        >
          <Text style={[styles.actionBtnText, liked && styles.actionBtnTextPrimary]}>
            {liked ? '❤️ Liked' : '🤍 Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, favorite && styles.actionBtnPrimary]}
          onPress={handleFavorite}
        >
          <Text style={[styles.actionBtnText, favorite && styles.actionBtnTextPrimary]}>
            {favorite ? '⭐ Saved' : '⭐ Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={handleRequestPitch}
        >
          <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
            📝 Request Pitch
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12
  },
  badges: {
    flexDirection: 'row',
    gap: 8
  },
  badge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  badgeSecondary: {
    backgroundColor: '#F3F4F6'
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff'
  },
  badgeTextSecondary: {
    color: '#6B7280'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24
  },
  section: {
    marginBottom: 24
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937'
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280'
  },
  actions: {
    gap: 12
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center'
  },
  actionBtnPrimary: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8'
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  actionBtnTextPrimary: {
    color: '#fff'
  }
});
