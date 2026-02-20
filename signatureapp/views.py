from django.shortcuts import render
from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from signatureapp.models import home,catagory,propertys,contact,catagory,serevices,about


# Create your views here.
def index(request):
	homes = home.objects.all()
	hom=homes.last()
	catagorys=catagory.objects.all()
	propertyss=propertys.objects.all().order_by('-id')[:6]
	contacts=contact.objects.all()
	contactss=contacts.last()

	context = {

		'hom': hom,
		'catagorys':catagorys,
		'propertyss':propertyss,
		'contactss':contactss

		}

	return render(request,'index.html',context,)


def aboutus(request):

	aboutss=about.objects.all()
	aboute=aboutss.last()
	contacts=contact.objects.all()
	contactss=contacts.last()

	context={
		'about':aboute,
		'contactss':contactss
	}
	return render(request,'about.html', context)


def services(request):
	
	serevice=serevices.objects.all()
	contacts=contact.objects.all()
	contactss=contacts.last()

	context={

		'serevice': serevice,
		'contactss':contactss
	}

	return render(request,'service.html',context)

def servicesdt(request,slug):
	
	serevice=serevices.objects.get(slug=slug)
	contacts=contact.objects.all()
	contactss=contacts.last()
	
	context={

		'serevice': serevice,
		'contactss':contactss
	}

	return render(request,'servicedt.html',context)


def properteas(request):
	
	property_list = propertys.objects.all()
	contacts=contact.objects.all()
	contactss=contacts.last()
	# Get selected category from query parameters
	selected_category = request.GET.get('category')
	if selected_category:
		property_list = property_list.filter(property_types__catagorys=selected_category)
	selected_filter = request.GET.get('filter')
	
	if selected_filter == 'Sale':
		property_list = property_list.filter(property_status='For Sale')
	elif selected_filter == 'Rent':
		property_list = property_list.filter(property_status='For Rent')
	elif selected_filter == 'LowToHigh':
		property_list = property_list.order_by('price')
	elif selected_filter == 'HighToLow':
		property_list = property_list.order_by('-price')
	paginator = Paginator(property_list, 6)  # Show 6 properties per page
	page_number = request.GET.get('page')
	properties = paginator.get_page(page_number)
	categories = catagory.objects.all()
	return render(request, 'properteas.html', {'properties': properties, 'categories': categories, 'selected_category': selected_category, 'selected_filter': selected_filter,'contactss':contactss,})


def filter_properties(request, category_slug):
	
	
	category = get_object_or_404(catagory, slug=category_slug)
	contacts=contact.objects.all()
	contactss=contacts.last()
	property_list = propertys.objects.filter(property_types=category)
	# Get selected category from query parameters
	selected_category = request.GET.get('category')
	if selected_category:
		property_list = property_list.filter(property_types__catagorys=selected_category)
	selected_filter = request.GET.get('filter')
	
	if selected_filter == 'Sale':
		property_list = property_list.filter(property_status='For Sale')
	elif selected_filter == 'Rent':
		property_list = property_list.filter(property_status='For Rent')
	elif selected_filter == 'LowToHigh':
		property_list = property_list.order_by('price')
	elif selected_filter == 'HighToLow':
		property_list = property_list.order_by('-price')
	paginator = Paginator(property_list, 6)  # Show 6 properties per page
	page_number = request.GET.get('page')
	properties = paginator.get_page(page_number)
	categories = catagory.objects.all()
	
	return render(request, 'filtered_properties.html', {'properties': properties,'contactss':contactss, 'categories': categories, 'selected_category': selected_category, 'selected_filter': selected_filter})



	
def properteasdet(request,slug):

	pro= propertys.objects.get(slug=slug)
	propertyss=propertys.objects.all().order_by('-id')[:3]
	contacts=contact.objects.all()
	contactss=contacts.last()



	context = {

		'pro':pro,
		'propertyss':propertyss,
		'contactss':contactss
		
		
		}


	return render(request,'apartment-single.html',context)





def contac(request):
	
	
	contacts=contact.objects.all()
	contactus=contacts.last()
	contacts=contact.objects.all()
	contactss=contacts.last()
	
	context = {
		'contac': contactus,
		'contactss':contactss
		
		}

	return render(request,'contact.html',context)