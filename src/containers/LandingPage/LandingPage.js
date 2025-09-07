import React from 'react';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';

import FallbackPage from './FallbackPage';
import { ASSET_NAME } from './LandingPage.duck';

import SectionHeroCustom from '../PageBuilder/SectionBuilder/SectionHeroCustom/SectionHeroCustom';
import SectionCarouselCustom from '../PageBuilder/SectionBuilder/SectionCarouselCustom/SectionCarouselCustom';
import SectionFeaturedFits from '../PageBuilder/SectionBuilder/SectionFeaturedFits/SectionFeaturedFits';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

export const LandingPageComponent = props => {
  const { pageAssetsData, inProgress, error } = props;

  const sectionOverrides = {
    hero: { component: SectionHeroCustom },
    carousel: { component: SectionCarouselCustom },
    featuredFits: { component: SectionFeaturedFits }
  };
  

  return (
    <PageBuilder
      pageAssetsData={pageAssetsData?.[camelize(ASSET_NAME)]?.data}
      inProgress={inProgress}
      options={{sectionComponents: sectionOverrides}}
      error={error}
      fallbackPage={<FallbackPage error={error} />}
    />
  );
};

LandingPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
  error: propTypes.error,
};

const mapStateToProps = state => {
  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  return { pageAssetsData, inProgress, error };
};

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const LandingPage = compose(connect(mapStateToProps))(LandingPageComponent);

export default LandingPage;
