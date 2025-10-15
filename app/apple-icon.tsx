import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
    width: 180,
    height: 180,
};
export const contentType = 'image/png';

// Image generation
const AppleIcon = () =>
    new ImageResponse(
        (
            <div
                style={{
                    fontSize: 24,
                    background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '40px',
                }}
            >
                <svg
                    width="120"
                    height="120"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M12 2C10.8954 2 10 2.89543 10 4V6H8C6.89543 6 6 6.89543 6 8V10H4C2.89543 10 2 10.8954 2 12C2 13.1046 2.89543 14 4 14H6V16C6 17.1046 6.89543 18 8 18H10V20C10 21.1046 10.8954 22 12 22C13.1046 22 14 21.1046 14 20V18H16C17.1046 18 18 17.1046 18 16V14H20C21.1046 14 22 13.1046 22 12C22 10.8954 21.1046 10 20 10H18V8C18 6.89543 17.1046 6 16 6H14V4C14 2.89543 13.1046 2 12 2Z"
                        fill="white"
                        opacity="0.3"
                    />
                    <circle cx="12" cy="12" r="3" fill="white" />
                    <path
                        d="M15 9L17 7M9 15L7 17M15 15L17 17M9 9L7 7"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        ),
        {
            ...size,
        }
    );

export default AppleIcon;
