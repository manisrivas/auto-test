import os
from setuptools import setup, find_packages

setup(
    name="autotest-hook",
    version="0.1.0",
    description="AI-powered pre-push test generator — generates unit tests automatically before every git push",
    long_description=open("README.md").read() if os.path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    author="Mani Srivas",
    author_email="manisrivasrg@gmail.com",
    url="https://github.com/manisrivas/auto-test",
    python_requires=">=3.8",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "autotest=autotest.cli:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Testing",
    ],
    keywords="testing ai git hooks pytest automated tests coverage",
)
