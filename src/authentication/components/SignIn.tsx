import * as React from 'react'
import { getFirebase } from 'src/util/firebase-app-initialized'
import { FirebaseAuth } from 'react-firebaseui'
import styled from 'styled-components'
import { colorPrimary } from 'src/common-ui/components/design-library/colors'
import { fontSizeBigger } from 'src/common-ui/components/design-library/typography'
const styles = require('src/authentication/components/styles.css')

export class SignInScreen extends React.Component {
    render = () => {
        return (
            <StyledFirebaseAuth
                className={styles.firebaseAuth}
                uiConfig={{
                    signInFlow: 'popup',
                    signInOptions: [
                        getFirebase().auth.EmailAuthProvider.PROVIDER_ID,
                    ],
                    callbacks: {
                        // Avoid redirects after sign-in.
                        signInSuccessWithAuthResult: () => false,
                    },
                }}
                firebaseAuth={getFirebase().auth()}
            />
        )
    }
}

const StyledFirebaseAuth = styled(FirebaseAuth)`
    .firebaseui-id-submit {
        background-color: ${colorPrimary};
    }

    .mdl-button--raised.mdl-button--colored {
        background-color: ${colorPrimary};
    }

    .firebaseui-id-submit :hover {
        background-color: ${colorPrimary};
    }

    .firebaseui-input {
        border-color: rgba(0, 0, 0, 0.12);
    }

    .firebaseui-container {
        margin: 0 auto;
        max-width: none;
    }

    .firebaseui-card-header {
        font-size: ${fontSizeBigger}px;
        font-weight: 600;
        color: #000000;
        margin-bottom: 2em;
    }

    .firebaseui-link {
        color: rgba(0, 0, 0, 0.18);
    }

    .firebaseui-id-secondary-link {
        color: ${colorPrimary};
    }
`