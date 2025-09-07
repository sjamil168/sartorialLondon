import React, { Component } from 'react';
import { arrayOf, bool, func, node, object, shape, string } from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { getMarketplaceEntities, getListingsById } from '../../../../ducks/marketplaceData.duck';
import { addMarketplaceEntities } from '../../../../ducks/marketplaceData.duck';
import { createImageVariantConfig } from '../../../../util/sdkLoader';
import { propTypes } from '../../../../util/types';
import { useConfiguration } from '../../../../context/configurationContext';
import { H1, H2 } from '../../../../components/index';
import Field, { hasDataInFields } from '../../Field/Field';
import BlockBuilder from '../../BlockBuilder/BlockBuilder';
import SectionContainer from '../SectionContainer/SectionContainer';
import ListingCard from '../../../../components/ListingCard/ListingCard';

import css from './SectionFeaturedFits.module.css';

// Redux action for fetching featured fits
const FETCH_FEATURED_FITS_REQUEST = 'app/SectionFeaturedFits/FETCH_FEATURED_FITS_REQUEST';
const FETCH_FEATURED_FITS_SUCCESS = 'app/SectionFeaturedFits/FETCH_FEATURED_FITS_SUCCESS';
const FETCH_FEATURED_FITS_ERROR = 'app/SectionFeaturedFits/FETCH_FEATURED_FITS_ERROR';

const fetchFeaturedFitsRequest = () => ({
  type: FETCH_FEATURED_FITS_REQUEST,
});

const fetchFeaturedFitsSuccess = (listings) => ({
  type: FETCH_FEATURED_FITS_SUCCESS,
  payload: listings,
});

const fetchFeaturedFitsError = (error) => ({
  type: FETCH_FEATURED_FITS_ERROR,
  payload: error,
});

// Action creator for fetching featured fits
export const loadFeaturedFits = (config) => (dispatch, getState, sdk) => {
  dispatch(fetchFeaturedFitsRequest());

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const aspectRatio = aspectHeight / aspectWidth;

  return sdk.listings
    .query({
      sort: 'createdAt', // Sort by creation date 
      state: 'published', // Only get published listings
      perPage: 4, // Get 4 most recent items for the carousel
      include: ['author', 'images'],
      // Add timestamp to prevent caching and ensure fresh data
      '_cacheBuster': Date.now(),
      'fields.listing': [
        'title',
        'geolocation',
        'price',
        'deleted',
        'state',
        'publicData.listingType',
        'publicData.transactionProcessAlias',
        'publicData.unitType',
        'publicData.pickupEnabled',
        'publicData.shippingEnabled',
        'publicData.priceVariationsEnabled',
        'publicData.priceVariants',
      ],
      'fields.user': ['profile.displayName', 'profile.abbreviatedName'],
      'fields.image': [
        'variants.scaled-small',
        'variants.scaled-medium',
        'variants.listing-card',
        'variants.listing-card-2x',
        `variants.${variantPrefix}`,
        `variants.${variantPrefix}-2x`,
      ],
      ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
      ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
      'limit.images': 1,
    })
    .then(response => {
      const listingFields = config?.listing?.listingFields;
      const sanitizeConfig = { listingFields };
      
      // Debug: Check the raw response
      console.log('🔍 Raw API Response:', response);
      console.log('🔍 Response data structure:', {
        data: response.data?.data?.length,
        included: response.data?.included?.length,
        hasIncludedImages: response.data?.included?.some(item => item.type === 'image')
      });
      
      // First add entities to Redux store
      dispatch(addMarketplaceEntities(response, sanitizeConfig));
      
      // Process listings to attach images manually
      const rawListings = response.data?.data || [];
      const includedImages = (response.data?.included || []).filter(item => item.type === 'image');
      
      console.log('🔍 Processing listings with images:', rawListings.length, 'listings,', includedImages.length, 'images');
      
      // Manually attach images to listings
      const processedListings = rawListings.map(listing => {
        const imageRefs = listing.relationships?.images?.data || [];
        const attachedImages = imageRefs.map(ref => {
          return includedImages.find(img => img.id.uuid === ref.id.uuid || img.id === ref.id);
        }).filter(Boolean);
        
        return {
          ...listing,
          images: attachedImages
        };
      });
      
      // Sort by newest first
      const sortedListings = processedListings.sort((a, b) => 
        new Date(b.attributes.createdAt) - new Date(a.attributes.createdAt)
      );
      
      // Debug: Check what listings look like with attached images
      sortedListings.forEach((listing, i) => {
        console.log(`📋 Listing ${i + 1} with images:`, {
          title: listing.attributes?.title,
          hasImages: listing.images?.length > 0,
          imageCount: listing.images?.length || 0,
          firstImageId: listing.images?.[0]?.id
        });
      });
      
      console.log('✅ About to dispatch success with', sortedListings.length, 'listings with images');
      dispatch(fetchFeaturedFitsSuccess(sortedListings));
      return response;
    })
    .catch(e => {
      console.error('Failed to fetch featured fits:', e);
      dispatch(fetchFeaturedFitsError(e));
    });
};

class SectionFeaturedFitsComponent extends Component {
  componentDidMount() {
    const { onLoadFeaturedFits, config } = this.props;
    if (config) {
      // Force load immediately
      onLoadFeaturedFits(config);
    }
    
    // Add event listener for when user returns to the page (e.g., after creating a listing)
    this.handleVisibilityChange = () => {
      if (!document.hidden && config) {
        // Page became visible - refresh the featured fits to show latest listings
        onLoadFeaturedFits(config);
      }
    };
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Also refresh every 30 seconds to catch new listings
    this.refreshInterval = setInterval(() => {
      if (config) {
        onLoadFeaturedFits(config);
      }
    }, 30000);
  }
  
  componentWillUnmount() {
    // Clean up event listener
    if (this.handleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    // Clean up interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  render() {
    const {
      sectionId,
      className,
      rootClassName,
      defaultClasses,
      title,
      description,
      appearance,
      callToAction,
      isInsideContainer = false,
      options,
      featuredFits = [],
      featuredFitsLoading = false,
      featuredFitsError = null,
      config,
    } = this.props;

    const classes = classNames(rootClassName || defaultClasses?.root, className);
    
    // Ensure we have a title - use the section title or default to "Featured Fits"
    const sectionTitle = title || { fieldType: 'heading2', content: 'Featured Fits' };
    
    // Debug title display
    console.log('🎯 Title debug:', { 
      originalTitle: title, 
      sectionTitle: sectionTitle,
      titleContent: sectionTitle?.content 
    });
    
    // Force header to show if we have a title
    const hasHeaderFields = true; // Always show header for Featured Fits

    if (featuredFitsLoading) {
      return (
        <SectionContainer
          id={sectionId}
          className={classes}
          appearance={appearance}
          isInsideContainer={isInsideContainer}
        >
          <div className={css.loadingContainer}>
            <FormattedMessage id="SectionFeaturedFits.loading" />
          </div>
        </SectionContainer>
      );
    }

    if (featuredFitsError || featuredFits.length === 0) {
      return null; // Don't show section if there's an error or no listings
    }

    return (
      <SectionContainer
        id={sectionId}
        className={classes}
        appearance={appearance}
        isInsideContainer={isInsideContainer}
      >
        <header className={defaultClasses?.sectionDetails}>
          <Field data={sectionTitle} className={defaultClasses?.title} options={options} />
          {description && (
            <Field data={description} className={defaultClasses?.description} options={options}>
              {(processedDescription, key) => <p key={key}>{processedDescription}</p>}
            </Field>
          )}
          {callToAction && (
            <Field data={callToAction} className={defaultClasses?.ctaButton} options={options}>
              {(processedCallToAction, key) => <div key={key}>{processedCallToAction}</div>}
            </Field>
          )}
        </header>

        <div className={css.featuredFitsContainer}>
          
          <div className={css.carousel}>
            {featuredFits.map((listing, index) => (
              <div key={listing.id?.uuid || index} className={css.carouselItem}>
                <ListingCard
                  listing={listing}
                  renderSizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw"
                  setActiveListing={() => {}} // Not needed for featured fits
                />
              </div>
            ))}
          </div>
        </div>
      </SectionContainer>
    );
  }
}

SectionFeaturedFitsComponent.defaultProps = {
  className: null,
  rootClassName: null,
  isInsideContainer: false,
  options: null,
  featuredFits: [],
  featuredFitsLoading: false,
  featuredFitsError: null,
};

SectionFeaturedFitsComponent.propTypes = {
  sectionId: string.isRequired,
  className: string,
  rootClassName: string,
  defaultClasses: shape({
    root: string,
    title: string,
    description: string,
    ctaButton: string,
    sectionDetails: string,
  }).isRequired,
  title: object,
  description: object,
  appearance: object,
  callToAction: object,
  isInsideContainer: bool,
  options: object,
  featuredFits: arrayOf(propTypes.listing),
  featuredFitsLoading: bool,
  featuredFitsError: object,
  config: object.isRequired,
  onLoadFeaturedFits: func,
};

// Redux state mapping
const mapStateToProps = state => {
  // For simplicity, we'll store featured fits in the SearchPage state
  // In a real app, you might want to create a dedicated slice for this
  return {
    featuredFits: state.SearchPage?.featuredFits || [],
    featuredFitsLoading: state.SearchPage?.featuredFitsLoading || false,
    featuredFitsError: state.SearchPage?.featuredFitsError || null,
  };
};

// Redux dispatch mapping  
const mapDispatchToProps = dispatch => ({
  onLoadFeaturedFits: (config) => dispatch(loadFeaturedFits(config)),
});

// Connected component
const ConnectedSectionFeaturedFits = connect(
  mapStateToProps,
  mapDispatchToProps
)(SectionFeaturedFitsComponent);

// Wrapper component that provides configuration
const SectionFeaturedFits = (props) => {
  const config = useConfiguration();
  return <ConnectedSectionFeaturedFits {...props} config={config} />;
};

export default SectionFeaturedFits;
