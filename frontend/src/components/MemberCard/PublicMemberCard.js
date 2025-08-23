import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Box,
  Chip,
  Link,
  IconButton,
  Skeleton,
  Alert,
  Divider,
  Grid
} from '@mui/material';
import {
  Phone,
  Email,
  Business,
  Download,
  Share,
  Visibility,
  Facebook,
  Instagram,
  LinkedIn,
  Twitter,
  YouTube,
  Language,
  Launch
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme, templateStyles }) => ({
  maxWidth: 600,
  margin: '0 auto',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  overflow: 'hidden',
  ...(templateStyles && {
    background: templateStyles.background || theme.palette.background.paper,
    color: templateStyles.color || theme.palette.text.primary,
  })
}));

const ProfileSection = styled(Box)(({ theme, templateStyles }) => ({
  background: templateStyles?.headerBackground || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: templateStyles?.headerColor || '#fff',
  padding: theme.spacing(4),
  textAlign: 'center',
  position: 'relative'
}));

const ContentBlock = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  borderRadius: 8,
  backgroundColor: theme.palette.grey[50],
  border: `1px solid ${theme.palette.grey[200]}`
}));

const SocialIcon = ({ platform }) => {
  const icons = {
    facebook: <Facebook />,
    instagram: <Instagram />,
    linkedin: <LinkedIn />,
    twitter: <Twitter />,
    youtube: <YouTube />,
    line: <Language />
  };
  
  return icons[platform?.toLowerCase()] || <Language />;
};

const PublicMemberCard = () => {
  const { userId } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templateStyles, setTemplateStyles] = useState({});

  useEffect(() => {
    fetchMemberCard();
  }, [userId]);

  const fetchMemberCard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/member-cards/public/${userId}`);
      
      if (response.data.success) {
        setCard(response.data.card);
        
        // Parse CSS styles if available
        if (response.data.card.cssStyles) {
          try {
            const styles = JSON.parse(response.data.card.cssStyles);
            setTemplateStyles(styles);
          } catch (e) {
            console.warn('無法解析模板樣式:', e);
          }
        }
      }
    } catch (error) {
      console.error('獲取電子名片失敗:', error);
      setError(error.response?.data?.message || '載入電子名片時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVCard = async () => {
    try {
      const response = await axios.get(`/api/member-cards/vcard/${userId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${card.member.name}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下載聯絡人失敗:', error);
      alert('下載聯絡人時發生錯誤');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${card.member.name} - 電子名片`,
      text: `查看 ${card.member.name} 的電子名片`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('分享取消或失敗');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('網址已複製到剪貼簿');
      } catch (error) {
        console.error('複製網址失敗:', error);
      }
    }
  };

  const renderContentBlock = (block) => {
    switch (block.block_type) {
      case 'text':
        return (
          <ContentBlock key={block.id}>
            {block.title && (
              <Typography variant="h6" gutterBottom color="primary">
                {block.title}
              </Typography>
            )}
            <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
              {block.content}
            </Typography>
          </ContentBlock>
        );

      case 'link':
        return (
          <ContentBlock key={block.id}>
            <Link
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Launch color="primary" />
              <Box>
                {block.title && (
                  <Typography variant="subtitle1" color="primary">
                    {block.title}
                  </Typography>
                )}
                {block.content && (
                  <Typography variant="body2" color="text.secondary">
                    {block.content}
                  </Typography>
                )}
              </Box>
            </Link>
          </ContentBlock>
        );

      case 'video':
        return (
          <ContentBlock key={block.id}>
            {block.title && (
              <Typography variant="h6" gutterBottom color="primary">
                {block.title}
              </Typography>
            )}
            <Box sx={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={block.url}
                title={block.title || '影片'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 8
                }}
                allowFullScreen
              />
            </Box>
          </ContentBlock>
        );

      case 'image':
        return (
          <ContentBlock key={block.id}>
            {block.title && (
              <Typography variant="h6" gutterBottom color="primary">
                {block.title}
              </Typography>
            )}
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={block.image_url}
                alt={block.title || '圖片'}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 8
                }}
              />
            </Box>
            {block.content && (
              <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                {block.content}
              </Typography>
            )}
          </ContentBlock>
        );

      case 'social':
        return (
          <ContentBlock key={block.id}>
            <Link
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <SocialIcon platform={block.social_platform} />
              <Box>
                <Typography variant="subtitle1" color="primary">
                  {block.title || block.social_platform}
                </Typography>
                {block.content && (
                  <Typography variant="body2" color="text.secondary">
                    {block.content}
                  </Typography>
                )}
              </Box>
            </Link>
          </ContentBlock>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Card sx={{ maxWidth: 600, margin: '0 auto', borderRadius: 2 }}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto', mb: 2 }} />
            <Skeleton variant="text" width="60%" height={40} sx={{ mx: 'auto', mb: 1 }} />
            <Skeleton variant="text" width="40%" height={30} sx={{ mx: 'auto', mb: 3 }} />
          </Box>
          <CardContent>
            <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={60} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={60} />
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!card) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">
          找不到此電子名片
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <StyledCard templateStyles={templateStyles}>
        {/* Profile Header */}
        <ProfileSection templateStyles={templateStyles}>
          <Avatar
            src={card.member.profilePictureUrl}
            alt={card.member.name}
            sx={{
              width: 120,
              height: 120,
              mx: 'auto',
              mb: 2,
              border: '4px solid rgba(255,255,255,0.2)'
            }}
          >
            {card.member.name?.charAt(0)}
          </Avatar>
          
          <Typography variant="h4" gutterBottom fontWeight="bold">
            {card.member.name}
          </Typography>
          
          {card.member.title && (
            <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
              {card.member.title}
            </Typography>
          )}
          
          {card.member.company && (
            <Typography variant="body1" sx={{ opacity: 0.8, mb: 2 }}>
              {card.member.company}
            </Typography>
          )}
          
          {card.member.chapterName && (
            <Chip
              label={card.member.chapterName}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
                mb: 2
              }}
            />
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadVCard}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.3)'
                }
              }}
            >
              儲存聯絡人
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Share />}
              onClick={handleShare}
              sx={{
                borderColor: 'rgba(255,255,255,0.5)',
                color: 'inherit',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.8)',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              分享名片
            </Button>
          </Box>
        </ProfileSection>

        <CardContent sx={{ p: 3 }}>
          {/* Contact Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              聯絡資訊
            </Typography>
            
            <Grid container spacing={2}>
              {card.member.contactNumber && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone color="primary" fontSize="small" />
                    <Link href={`tel:${card.member.contactNumber}`} underline="none">
                      <Typography variant="body2">
                        {card.member.contactNumber}
                      </Typography>
                    </Link>
                  </Box>
                </Grid>
              )}
              
              {card.member.email && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email color="primary" fontSize="small" />
                    <Link href={`mailto:${card.member.email}`} underline="none">
                      <Typography variant="body2">
                        {card.member.email}
                      </Typography>
                    </Link>
                  </Box>
                </Grid>
              )}
              
              {card.member.industry && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business color="primary" fontSize="small" />
                    <Typography variant="body2">
                      {card.member.industry}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Content Blocks */}
          {card.contentBlocks && card.contentBlocks.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box>
                {card.contentBlocks.map(renderContentBlock)}
              </Box>
            </>
          )}

          {/* View Count */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 3, opacity: 0.6 }}>
            <Visibility fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="caption">
              瀏覽次數: {card.viewCount || 0}
            </Typography>
          </Box>
        </CardContent>
      </StyledCard>
    </Container>
  );
};

export default PublicMemberCard;