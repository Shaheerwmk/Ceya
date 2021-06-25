import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));


import os
import shutil
import sys
import zipfile
from shutil import copyfile
from win32com.client import Dispatch
import subprocess
from subprocess import Popen

def zip(source_folder, destination_file):
    zf = zipfile.ZipFile(destination_file, "w", zipfile.ZIP_DEFLATED)
    abs_src = os.path.abspath(source_folder)
    for dirname, subdirs, files in os.walk(source_folder):
        for filename in files:
            absname = os.path.abspath(os.path.join(dirname, filename))
            arcname = absname[len(abs_src) + 1:]
            print('zipping {} as {}'.format(os.path.join(dirname, filename), arcname))
            zf.write(absname, arcname)
    zf.close()

def unzip(src_file, dest_folder):
    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)
    with zipfile.ZipFile(src_file, 'r') as zip_ref:
        zip_ref.extractall(dest_folder)

def prepare_web_deploy_artifacts(src_folder, dest_folder, dest_file):
    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)
    #zip(src_folder, dest_folder + "\\" + dest_file)
    shutil.rmtree(dest_folder)
    shutil.copytree(src_folder, dest_folder)

def update_package(src_folder, package_to_update, temp_folder, package_folder_name):
    dest_folder = ""
    if not os.path.exists(temp_folder):
        os.makedirs(temp_folder)
    unzip(package_to_update, temp_folder)
    for folder in os.walk(temp_folder):
        if folder[0].endswith("PackageTmp"):
            dest_folder = folder[0]
            break
    shutil.rmtree(dest_folder)
    shutil.copytree(src_folder, dest_folder)
    zip(temp_folder, package_to_update)

def get_version_number(filename):
    parser = Dispatch("Scripting.FileSystemObject")
    version = parser.GetFileVersion(filename)
    return version


def write_service_build_registry(dll, filename, type):
    build = get_version_number(dll)
    with open(filename, "w") as text_file:
        text_file.write(type + build)


build_type = "dev-"
if len(sys.argv) > 1:
    if sys.argv[1] == "Release":
        build_type = "rel-"


def create_service_artifact(location, service_id):
    src_folder = "Binaries\\Archive\\Content\\" + location
    dest_folder = "Artifacts"
    #write_service_build_registry("Binaries\\Occ.Web.dll", "Artifacts\\" + service_id + ".version.txt", build_type)
    prepare_web_deploy_artifacts(src_folder, dest_folder, service_id + ".zip")
    #copyfile("Artifacts\\" + service_id + ".version.txt", "\\\\wn000003356\\Artifactory\\tip\\" + service_id + ".version.txt")
    #copyfile("Artifacts\\" + service_id + ".zip", "\\\\wn000003356\\Artifactory\\tip\\" + service_id + ".zip")
    zip(src_folder, "\\\\wn000003356\\Artifactory\\tip\\" + service_id + ".zip")

create_service_artifact("Occ.Web", "lynx.occ.web")


================
  #!groovy
@Library('optumLynxOccJenkinsLibrary@master')
// ------------------------ flags -----------------------------
def RUN_BUILD       = true   // run build (can be false, if you just need fortify)
def RUN_ANG_TESTS	= true	 //run angular unit tests
def RUN_UTESTS      = false   // run unit tests
def NOTIFY_STATUS   = true   // send status e-mail 
def RUN_SONAR       = true  // run sonar commands
def RUN_ARCHIVE     = true   // archive all files from dist folder
def RUN_ARTIFACTS	= true
def VERBOSE         = true   // do run dir commands and such
// ---------------------- constants ----------------------------
def BUILD_SERVER    = "occ_build_farm"
def BUILD_CONFIG    = "Release" // "Debug", "Prod", "Release"
def STATUS_EMAIL    = 'lynxdev@optum360.com'
def SONAR_SCAN_PATH   = "C:\\jenkins\\tools\\sonar\\sonar-scanner-4.3\\bin" // "C:\\jenkins\\tools\\hudson.plugins.sonar.MsBuildSQRunnerInstallation\\SonarQubeScanner"
def GIT_URL         = "https://github.optum.com/Product-Lynx/Optum.Lynx.Occ.Web"
//def BUILD_CONFIG_DEV = "DEV"
//def BUILD_CONFIG_QA  = "QA"
// -------------------- utilities -----------------------------
def VS_PATH           = "C:\\Program Files (x86)\\Microsoft Visual Studio 14.0"
def DEVENV            = "C:\\Program Files (x86)\\Microsoft Visual Studio 14.0\\Common7\\IDE\\devenv"
def VS_IDE_PATH       = VS_PATH + "\\Common7\\IDE"
def MS_BUILD          = "C:\\Program Files (x86)\\MSBuild\\14.0\\Bin\\MSBuild.exe"
def MSBUILD_VERB      = "/v:q" // verbosity of ms build: q[uiet], m[inimal], n[ormal], d[etailed], and diag[nostic].
def SONAR_LOGIN     = "092c919905283a6d35ff1abe2128fc52e48a6156"
def SONAR_EXCLUSION = "**/*.js,**/*.spec.ts,Src/**/src/app/blocks/*.ts,Src/**/src/app/core/*.ts,Src/**/src/app/feature/*.ts,Src/**/src/app/feature/icdBrowser/*.ts,**/src/app/directives/*.ts,**/src/app/feature/encounterEdit/location/**/*.ts,**/src/app/feature/encounterEdit/reg/*.ts,**/src/app/feature/encounterEdit/root/*.ts"
def branchName = params.BranchName
def CHECK_FORTIFY = true // check latest fortify status
def FORTIFY_CRTICAL_ISSUE_THRESHOLD = "0"
def FORTIFY_HIGH_ISSUE_THRESHOLD = "0"
def FORTIFY_PROJECT_VERSION = "22622"
def RepoUrl = 'https://github.optum.com/Product-Lynx/Optum.Lynx.Occ.Web'
def JenkinsURL = 'https://jenkins.optum.com/o360delivery/job/Product-Lynx/job/Lynx-Occ-Web'
def SonarURL = 'https://sonar.optum.com'

// ----------------------- tips and tricks --------------------
// 1. If you need to disable failure on 'bat' error add '& echo ignore_errors' to it
//    for instance instead of: bat 'mybadprog.exe' run: bat 'mybadprog.exe & echo ignore_errors'.
//

// ************************************************************
// build stages 
// ************************************************************
node(BUILD_SERVER) {
	try {
		stage('Environment Echo')
		{
			if (VERBOSE) {
				bat 'whoami'
				echo "Environment: ${BUILD_CONFIG}"
			}
		}
		stage('Checkout')
		{
			if (branchName == null)
			{
				git credentialsId: 'o360_ms_credentials', url: GIT_URL
				branchName = 'master'
			}
			else {
				git credentialsId: 'o360_ms_credentials', url: GIT_URL, branch: '${branchName}'
				RUN_SONAR = false
				//RUN_ARTIFACTS = false
				RUN_ANG_TESTS = false
			}

			echo "Branch Name: ${branchName}"

			bat '''git log -10 --pretty=format:"<li>%%an, %%ar : - %%s</li>">last_changes.txt'''
			bat '''type last_changes.txt'''
		
			archiveArtifacts  'last_changes.txt'

			if (VERBOSE) { 
				bat 'dir'
			}
		}
		//stage('Install Chrome')
		//{
		//	bat "C:\\jenkins\\softwares\\chromesetup.exe /silent /install"
		//}
		stage('Nuget')
		{
			// restore NuGet packages
			bat ".nuget\\nuget.exe restore Occ.web.sln"
		}
		stage('NPM Build')
		{
			//bat 'npm install -g npm'
			bat 'npm -v'
			dir ('Src\\Occ.Web')
			{
				lock(resource: BUILD_SERVER +'_OCC_WEB_NPM')
				{
					bat 'npm install'
					bat 'ng build --prod'
				}
			}
		}
		stage('ANG Test')
		{
			bat 'if exist TestResults rd TestResults /S /Q'
			bat 'if not exist TestResults mkdir TestResults'
			//bat 'xcopy /s /y /i "e:\\google" "C:\\Users\\occjenkinsuser1\\AppData\\Local\\google"'
			dir ('Src\\Occ.Web')
			{
				if (RUN_ANG_TESTS){
					echo "Run angular unit tests"
					bat "C:\\Users\\occjenkinsuser1\\AppData\\Roaming\\npm\\ng test --code-coverage --watch=false"
				}
			}
			try{
				bat '%AppData%\\npm\\tslint -c %CD%\\tslint.json %CD%\\Src\\Occ.Web\\src\\**\\*.ts -o %CD%\\TestResults\\issues.json -t json --outputAbsolutePaths'
			} catch(err){}
		}
		stage('Sonar')
		{
			if (RUN_SONAR) {	
				// prepare Sonar
				def sonar_begin_cmd = [
				 "${SONAR_SCAN_PATH}\\sonar-scanner",
				 "-Dsonar.projectKey=com.optum.lynx.occ:OccWeb:master",
			     "-Dsonar.projectName=Lynx-Occ-Web",
			     "-Dsonar.version=1.0.1",
				 "-Dsonar.host.url=${SonarURL}",
				 "-Dsonar.links.ci=${JenkinsURL}",
				 "-Dsonar.login=${SONAR_LOGIN}",
				 "-Dsonar.links.scm=${RepoUrl}",
				 "-Dsonar.exclusions=${SONAR_EXCLUSION}", 
				 "-Dsonar.sources=Src/Occ.Web/src/app",
				 "-Dsonar.javascript.lcov.reportPaths=Src/Occ.Web/coverage/OccWeb/lcov.info"
				].join(' ')

				if(RUN_ANG_TESTS){
					bat sonar_begin_cmd
				}
				if (RUN_BUILD) {
					echo "add Angular UT code coverage results"
					sonar_begin_cmd+="-Dsonar.javascript.lcov.reportPaths=%CD%\\Src\\Occ.Web\\coverage\\OccWeb\\lcov.info";
				}
			}
		}
		stage('MS Build')
		{
			bat 'if exist Binaries rmdir Binaries /S /Q'
			bat 'if exist Artifacts rmdir /s /q Artifacts'
			bat 'if not exist Artifacts mkdir Artifacts'

			bat "\"${MS_BUILD}\" src/occ.web/Occ.Web.csproj ${MSBUILD_VERB} /p:Configuration=\"${BUILD_CONFIG}\" /nologo /nr:False /fl /p:DeployOnBuild=True /p:PackageLocation=%CD%/Binaries /p:PublishProfile=Occ.Web.pubxml"
			
			bat 'xcopy WebConfigs Binaries\\Archive\\Content\\Occ.Web\\WebConfigs /k/r/e/i/s/c/h/f/y'
			if (VERBOSE) {
				bat 'dir Binaries\\Archive\\Content\\Occ.Web'
			}
		}
		stage('Fortify')
		{
			if (CHECK_FORTIFY) {

				validateFortifyIssueCountFromScarPortal ProjectVersion: FORTIFY_PROJECT_VERSION,
					CrticalIssueThreshold: FORTIFY_CRTICAL_ISSUE_THRESHOLD, 
					HighIssueThreshold: FORTIFY_HIGH_ISSUE_THRESHOLD, 
					CredentialId: 'occjenkinsuser1'
			}
		}
		stage('Artifacts')
		{
			if (RUN_ARTIFACTS) 
			{
				writeFile file: "\\Binaries\\Archive\\Content\\Occ.Web\\Views\\Home\\Index.cshtml", text: readFile("\\Src\\Occ.Web\\dist\\OccWeb\\index.html").replaceAll('href="styles', 'href="./assets/styles')
				dir('Binaries\\Archive\\Content\\Occ.Web')
				{					
					bat 'if not exist assets mkdir assets'
					bat 'move /y *.svg assets'
					bat 'move /y *.woff assets'
					bat 'move /y *.woff2 assets'
					bat 'move /y *.ttf assets'
					bat 'move /y *.eot assets'
					bat 'move /y *.css assets'
					bat 'move /y *.ico assets'
					bat 'rmdir /s/q dist'
					bat 'rmdir /s/q src'
					bat 'rmdir /s/q "Connected Services"'
					bat 'del /f /q /s .gitignore* .editorconfig* browserslist* extra-webpack.config.js angular.json karma.conf.js karma.conf.js tsconfig.* tslint.json parameters.xml package.json package-lock.json README.md'
				}
				
				bat 'xcopy /s /y /i \"%CD%\\Binaries\\Archive\\Content\\Occ.Web\" \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web\"'
				archive 'Binaries/_PublishedWebsites/Occ.Web/**'

				bat "python prepare_packages.py " + BUILD_CONFIG		
			}
		}
		stage('Archive')
		{
			if (RUN_ARCHIVE) {
				archiveArtifacts 'Artifacts/**'
			}
		}		
		stage('Notifications')
		{
			if (NOTIFY_STATUS) {
				def changes = readFile "last_changes.txt"
				emailext to: STATUS_EMAIL, subject: 'build: Optum.Lynx.Occ.Web Successfully built',
   					body: '<p style="font-size:120%;">Branch: <b><i>' + branchName + '</i></b><br>Last commits:</p><ul>' + changes + '</ul>'
			}
		} 
	 }
	catch (ex) {
		if (NOTIFY_STATUS) {
			def changes = readFile "last_changes.txt"
			emailext to: STATUS_EMAIL, subject: 'build: Optum.Lynx.Occ.Web FAILED',
   				body: '<p style="font-size:120%;">Branch: <b><i>' + branchName + '</i></b><br>Last commits:</p><ul>' + changes + '</ul>'
		}
		throw ex 		
	} 
}


====================
  Archive.groovy

#!groovy
@Library('optumLynxOccJenkinsLibrary@master')
// ------------------------ flags -----------------------------
def RUN_BUILD       = true   // run build (can be false, if you just need fortify)
def RUN_ANG_TESTS	= false	 //run angular unit tests
def RUN_UTESTS      = false   // run unit tests
def NOTIFY_STATUS   = true   // send status e-mail 
def RUN_SONAR       = true  // run sonar commands
def RUN_ARCHIVE     = true   // archive all files from dist folder
def RUN_ARTIFACTS	= true
def VERBOSE         = true   // do run dir commands and such
// ---------------------- constants ----------------------------
def BUILD_SERVER    = "occ_build_farm"
def BUILD_CONFIG    = "Release" // "Debug", "Prod", "Release"
def STATUS_EMAIL    = 'lynxdev@optum360.com'
def SONAR_SCAN_PATH   = "C:\\jenkins\\tools\\sonar\\sonar-scanner-4.3\\bin" // "C:\\jenkins\\tools\\hudson.plugins.sonar.MsBuildSQRunnerInstallation\\SonarQubeScanner"
def GIT_URL         = "https://github.optum.com/Product-Lynx/Optum.Lynx.Occ.Web"
// -------------------- utilities -----------------------------
def VS_PATH           = "C:\\Program Files (x86)\\Microsoft Visual Studio 14.0"
def DEVENV            = "C:\\Program Files (x86)\\Microsoft Visual Studio 14.0\\Common7\\IDE\\devenv"
def VS_IDE_PATH       = VS_PATH + "\\Common7\\IDE"
def MS_BUILD          = "C:\\Program Files (x86)\\MSBuild\\14.0\\Bin\\MSBuild.exe"
//def SONAL_SCAN_PATH   = "C:\\jenkins\\tools\\sonar\\MSBuild.SonarQube.Runner-4.7" // "C:\\jenkins\\tools\\hudson.plugins.sonar.MsBuildSQRunnerInstallation\\SonarQubeScanner"
def MSBUILD_VERB      = "/v:q" // verbosity of ms build: q[uiet], m[inimal], n[ormal], d[etailed], and diag[nostic].
def SONAR_LOGIN     = "092c919905283a6d35ff1abe2128fc52e48a6156"
def SONAR_EXCLUSION = "**/*.js,**/*.spec.ts,Src/**/src/app/testing/*.ts"
def branchName = params.BranchName
def CHECK_FORTIFY = true // check latest fortify status
def FORTIFY_CRTICAL_ISSUE_THRESHOLD = "0"
def FORTIFY_HIGH_ISSUE_THRESHOLD = "0"
def FORTIFY_PROJECT_VERSION = "22622"
def RepoUrl = 'https://github.optum.com/Product-Lynx/Optum.Lynx.Occ.Web'
def JenkinsURL = 'https://jenkins.optum.com/o360delivery/job/Product-Lynx/job/Lynx-Occ-Web'
def SonarURL = 'https://sonar.optum.com'

// ----------------------- tips and tricks --------------------
// 1. If you need to disable failure on 'bat' error add '& echo ignore_errors' to it
//    for instance instead of: bat 'mybadprog.exe' run: bat 'mybadprog.exe & echo ignore_errors'.
//

// ************************************************************
// build stages 
// ************************************************************
node(BUILD_SERVER) {
	try {
		stage('Environment Echo')
		{
			if (VERBOSE) {
				bat 'whoami'
			}
		}
		stage('Checkout')
		{
			if (branchName == null)
			{
				git credentialsId: 'o360_ms_credentials', url: GIT_URL
				branchName = 'master'
			}
			else {
				git credentialsId: 'o360_ms_credentials', url: GIT_URL, branch: '${branchName}'
				RUN_SONAR = false
				RUN_ARTIFACTS = false
				RUN_ANG_TESTS = false
			}

			echo "Branch Name: ${branchName}"

			bat '''git log -10 --pretty=format:"<li>%%an, %%ar : - %%s</li>">last_changes.txt'''
			bat '''type last_changes.txt'''
		
			archiveArtifacts  'last_changes.txt'

			if (VERBOSE) { 
				bat 'dir'
			}
		}
		stage('Build')
		{
			bat 'if exist TestResults rd TestResults /S /Q'
			bat 'if not exist TestResults mkdir TestResults'
			bat 'if exist Binaries rmdir Binaries /S /Q'
			bat 'if not exist Artifacts mkdir Artifacts'

			// restore NuGet packages
			bat ".nuget\\nuget.exe restore Occ.web.sln"

			bat 'dir Src\\Occ.Web'

			//bat 'npm install -g npm'
			bat 'npm -v'

			dir ('Src\\Occ.Web')
			{
				lock(resource: BUILD_SERVER +'_OCC_WEB_NPM')
				{
					bat 'npm install'
					bat 'dir'
					bat 'ng build --prod'
					bat "dir"
				}

				if (RUN_ANG_TESTS){
					echo "Run angular unit tests"
					bat "C:\\Users\\occjenkinsuser1\\AppData\\Roaming\\npm\\ng test --code-coverage --watch=false"
				}

			}

			bat 'dir'

			try{
				bat '%AppData%\\npm\\tslint -c %CD%\\tslint.json %CD%\\Src\\Occ.Web\\src\\**\\*.ts -o %CD%\\TestResults\\issues.json -t json --outputAbsolutePaths'
			} catch(err){
			}
		

			if (RUN_SONAR) {	
				// prepare Sonar
					def sonar_begin_cmd = [
					 "${SONAR_SCAN_PATH}\\sonar-scanner",
					 "-Dsonar.projectKey=com.optum.lynx.occ:OccWeb",
			         "-Dsonar.projectName=Lynx-Occ-Web",
			         "-Dsonar.version=1.0.1",
					 "-Dsonar.host.url=${SonarURL}",
					 "-Dsonar.links.ci=${JenkinsURL}",
					 "-Dsonar.login=${SONAR_LOGIN}",
					 "-Dsonar.links.scm=${RepoUrl}",
					 "-Dsonar.exclusions=${SONAR_EXCLUSION}", 
					 "-Dsonar.sources=Src/Occ.Web/src",
					 "-Dsonar.javascript.lcov.reportPaths=Src/Occ.Web/coverage/OccWeb/lcov.info"
					].join(' ')

				if(RUN_ANG_TESTS){
				bat sonar_begin_cmd
			}		
			//
			// Cleanup output directory for binaries
			//
		
			if (RUN_BUILD) {
					echo "add Angular UT code coverage results"
					sonar_begin_cmd+="-Dsonar.javascript.lcov.reportPaths=%CD%\\Src\\Occ.Web\\coverage\\OccWeb\\lcov.info";
				}

				bat "\"${MS_BUILD}\" Occ.Web.sln ${MSBUILD_VERB} /p:Configuration=\"${BUILD_CONFIG}\" /p:OutDir=%CD%/Binaries /nologo /nr:False /fl /p:SkipInvalidConfigurations=true /p:DeployOnBuild=True /p:CreatePackageOnPublish=True /p:DeployTarget=Package /p:MSDeployPublishMethod=InProc"

				dir('Src\\Occ.Web'){
					//bat 'postbuild.bat %CD%'
				}

				if (VERBOSE) {
					bat 'dir Binaries\\_PublishedWebsites\\Occ.Web'
				}

			}
		}
				  		
		stage('Archive')
		{
			if (RUN_ARCHIVE) {
				// bat 'xcopy /s /y /i \"%CD%\\Src\\Occ.Web\\dist\\OccWeb\" \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web\"'
				 //bat 'rmdir /s/q \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\dist"'
				// bat 'rmdir /s/q \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\src"'
				 //bat 'rmdir /s/q \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\Connected Services"'
				 //bat 'del \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\.gitignore.txt\"'
				// bat 'del \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\angular.json\"'
				//bat 'del \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\karma.conf.js\"'			
				// bat 'del \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\tsconfig.*\"'
				// bat 'del \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\tslint.json\"'
				// bat 'del \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\parameters.xml\"'
				// bat 'del \"%CD%\\Binaries\\_PublishedWebsites\\Occ.Web_Package\\Archive\\Content\\Occ.Web\\package-lock.json\"'


				archive 'Binaries/_PublishedWebsites/Occ.Web/**'
			}
			if (RUN_ARTIFACTS) {
				bat "python prepare_packages.py " + BUILD_CONFIG
				archiveArtifacts 'Artifacts/**'
			}
		}
	
		//stage('Sonar')
		//{
		//	if (RUN_SONAR) {
		//
		//		def stdOut = bat(returnStdout: true, script: "${SONAR_SCAN_PATH}\\MSBuild.SonarQube.Runner.exe end /d:sonar.login=${SONAR_LOGIN}")
		//		echo "<STDOUTBEGIN>${stdOut}<STDOUTEND>"
		//
		//		if (!stdOut.endsWith("succeeded.\r\n")) {
		//			bat "exit 1"
		//		}
		//
		//		if (ARCHIVE_SONAR) {
		//			archive 'TestResults/**'
		//		}
		//	}			
		//}

		stage('Fortify')
		{
			if (CHECK_FORTIFY) {

				validateFortifyIssueCountFromScarPortal ProjectVersion: FORTIFY_PROJECT_VERSION,
					CrticalIssueThreshold: FORTIFY_CRTICAL_ISSUE_THRESHOLD, 
					HighIssueThreshold: FORTIFY_HIGH_ISSUE_THRESHOLD, 
					CredentialId: 'occjenkinsuser1'
			}
		}

		stage('Notifications')
		{
			if (NOTIFY_STATUS) {
				def changes = readFile "last_changes.txt"
				emailext to: STATUS_EMAIL, subject: 'build: Optum.Lynx.Occ.Web Successfully built',
   					body: '<p style="font-size:120%;">Branch: <b><i>' + branchName + '</i></b><br>Last commits:</p><ul>' + changes + '</ul>'
			}
		} 
	 }
	catch (ex) {
		if (NOTIFY_STATUS) {
			def changes = readFile "last_changes.txt"
			emailext to: STATUS_EMAIL, subject: 'build: Optum.Lynx.Occ.Web FAILED',
   				body: '<p style="font-size:120%;">Branch: <b><i>' + branchName + '</i></b><br>Last commits:</p><ul>' + changes + '</ul>'
		}
		throw ex 		
	} 
}

