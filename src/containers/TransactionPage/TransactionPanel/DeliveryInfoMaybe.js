import React from 'react';
import classNames from 'classnames';

import getCountryCodes from '../../../translations/countryCodes';
import { FormattedMessage } from '../../../util/reactIntl';
import { Heading } from '../../../components';

import css from './TransactionPanel.module.css';

const DeliveryInfoMaybe = props => {
  const { className, rootClassName, protectedData, locale } = props;
  const classes = classNames(rootClassName || css.deliveryInfoContainer, className);

  // Always show shipping info from protectedData.shippingDetails
  const { name, phoneNumber, address } = protectedData?.shippingDetails || {};
  const { line1, line2, city, postalCode, state, country: countryCode } = address || {};
  const phoneMaybe = phoneNumber ? (
    <>
      {phoneNumber}
      <br />
    </>
  ) : null;

  const countryCodes = getCountryCodes(locale);
  const countryInfo = countryCodes.find(c => c.code === countryCode);
  const country = countryInfo?.name;

  // If no shippingDetails, maybe show nothing
  if (!name && !line1) {
    return null;
  }

  return (
    <div className={classes}>
      <Heading as="h3" rootClassName={css.sectionHeading}>
        <FormattedMessage id="TransactionPanel.shippingInfoHeading" />
      </Heading>
      <div className={css.shippingInfoContent}>
        {name}
        <br />
        {phoneMaybe}
        {line1}
        {line2 ? `, ${line2}` : ''}
        <br />
        {postalCode}, {city}
        <br />
        {state ? `${state}, ` : ''}
        {country}
        <br />
      </div>
    </div>
  );
};

export default DeliveryInfoMaybe;
